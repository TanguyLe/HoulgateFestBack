let mongoose = require("mongoose"),
    User = mongoose.model("Users"),
    passwordUtils = require("../utils/password"),
    labels = require("../../labels"),
    tokenUtils = require("../utils/token");

const fillUserAndTokens = (user, res) => {
    let accessToken = tokenUtils.generateAccessToken({
        username: user.username,
        email: user.email,
    });

    res.json({
        username: user.username,
        activated: user.activated,
        accessToken: accessToken,
        refreshToken: tokenUtils.generateRefreshToken(accessToken),
    });
};

exports.login = (req, res) => {
    User.findOne({ email: req.body.email }).then(
        (user) => {
            if (!user)
                return res
                    .status(401)
                    .json({ wrongField: "email", message: labels.FAILED_AUTH_NO_USER_MSG });

            if (!user.activated) return res.status(401).json({ wrongField: "activation" });

            passwordUtils
                .comparePassword(req.body.password, user.password)
                .then((authenticated) => {
                    if (!authenticated)
                        return res.status(401).json({
                            wrongField: "password",
                            message: labels.FAILED_AUTH_WRONG_PSWD_MSG,
                        });

                    fillUserAndTokens(user, res);
                });
        },
        (err) => {
            res.json(err);
        }
    );
};

exports.createUser = (req, res, next) => {
    passwordUtils.cryptPassword(req.body.password).then((resPassword) => {
        let newUserInfo = req.body;
        newUserInfo.password = resPassword;

        let newUser = new User(newUserInfo);

        User.findOne({ email: newUserInfo.email }).then(
            (user) => {
                if (!user) {
                    newUser.save().then(
                        (user) => {
                            console.log("Created user " + newUserInfo.email);
                            req.activator = { id: user.id };
                            next();
                        },
                        (err) => res.send(err)
                    );
                } else {
                    res.json({
                        errors: {
                            email: {
                                message: `Email ${newUserInfo.email} is already taken, take another.`,
                            },
                        },
                    });
                }
            },
            (err) => res.send(err)
        );
    });
};

exports.createActivateHandler = function (req, res, next) {
    // the header is not normally set, so we know we incurred the handler
    res.set("activator", "createActivateHandler");
    res.status(201).send({});
};

exports.afterCompleteActivation = (req, res) => {
    User.findById(req.params.user)
        .then((user) => {
            console.log("Activated user " + user.email);
            fillUserAndTokens(user, res);
        })
        .catch((err) => {
            res.send(err);
        });
};

exports.readUser = (req, res) => {
    User.findById(req.params.userId)
        .then((user) => {
            res.json({
                email: user.email,
                username: user.username,
                activated: user.activated,
            });
        })
        .catch((err) => {
            res.send(err);
        });
};

exports.beforeCreatePasswordReset = (req, res, next) => {
    User.findOne({ email: req.body.email }).then(
        (user) => {
            if (!user)
                return res
                    .status(401)
                    .json({ wrongField: "email", message: labels.FAILED_AUTH_NO_USER_MSG });
            else if (user && !user.activated)
                return res.status(401).json({
                    wrongField: "activation",
                    message: labels.FAILED_AUTH_ACCOUNT_UNACTIVATED_MSG,
                });

            req.params.user = user;
            next();
        },
        (err) => {
            res.json(err);
        }
    );
};

exports.afterCreatePasswordReset = (req, res) => {
    res.status(200).json({});
};

exports.afterCompletePasswordReset = (req, res) => {
    console.log("Password reset for user " + req.params.user);
    res.status(200).json({});
};

exports.refreshLogin = (req, res) => {
    let user = undefined;
    let accessToken = tokenUtils.getJWTToken(req.headers);

    tokenUtils.checkAccessToken(
        accessToken,
        (err, decode) => {
            user = decode;
        },
        true
    );

    if (
        !user ||
        !tokenUtils.checkRefreshToken(accessToken, req.body.refreshToken) ||
        !tokenUtils.checkIfAccessTokenExpired(accessToken)
    )
        return res.status(401).json({ message: labels.FAILED_AUTH_INVALID_CRED_MSG });

    let newAccessToken = tokenUtils.generateAccessToken({
        username: user.username,
        email: user.email,
    });

    res.json({
        username: user.username,
        accessToken: newAccessToken,
        refreshToken: tokenUtils.generateRefreshToken(newAccessToken),
    });
};

// Display list of all users.
exports.userList = (req, res) => {
    User.find({}, { password: 0, __v: 0 })
        .then((users) => {
            res.status(200).send({
                meta: {
                    code: "200",
                },
                data: users,
            });
        })
        .catch((err) => {
            res.status(500).send({
                meta: {
                    error_type: "Error 500 : Internal Server Error",
                    code: "500",
                    error_message: err.message || "Some error occurred while retrieving users.",
                },
            });
        });
};
