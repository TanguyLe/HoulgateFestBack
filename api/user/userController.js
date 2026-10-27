let mongoose = require("mongoose"),
    jwt = require("jsonwebtoken"),
    User = mongoose.model("Users"),
    passwordUtils = require("../utils/password"),
    labels = require("../../labels"),
    { sendServerError } = require("../utils/errors"),
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

// bcrypt rejects non-string passwords, which would crash the server as an unhandled rejection
const isPassword = (password) => typeof password === "string" && password.length > 0;

// Emails are cast to strings so a JSON body like {"$ne": null} can't inject query operators
exports.login = (req, res) => {
    if (!isPassword(req.body.password))
        return res.status(400).json({ wrongField: "password", message: "Password required" });

    User.findOne({ email: String(req.body.email) }).then(
        (user) => {
            if (!user) {
                console.warn("Login refused: unknown email");
                return res
                    .status(401)
                    .json({ wrongField: "email", message: labels.FAILED_AUTH_NO_USER_MSG });
            }

            if (!user.activated) {
                console.warn("Login refused for " + user.username + ": account not activated");
                return res.status(401).json({ wrongField: "activation" });
            }

            passwordUtils
                .comparePassword(req.body.password, user.password)
                .then((authenticated) => {
                    if (!authenticated) {
                        console.warn("Login refused for " + user.username + ": wrong password");
                        return res.status(401).json({
                            wrongField: "password",
                            message: labels.FAILED_AUTH_WRONG_PSWD_MSG,
                        });
                    }

                    console.log("User " + user.username + " logged in");
                    fillUserAndTokens(user, res);
                })
                .catch((err) => sendServerError(res, err));
        },
        (err) => {
            sendServerError(res, err);
        },
    );
};

// Same messages as the `unique` options of the user model
const DUPLICATE_MESSAGES = {
    email: "Un compte avec cet email existe déjà.",
    username: "Ce nom d'utilisateur n'est pas disponible.",
};

// Turns a failed user save into the `errors` shape the sign up form displays, without leaking
// the raw DB error; anything else is a server error
const sendSaveError = (res, err) => {
    if (err.name === "ValidationError") {
        let errors = {};
        for (let field in err.errors) errors[field] = { message: err.errors[field].message };
        return res.json({ errors: errors });
    }

    // duplicate key: the username (or a concurrently registered email) is taken
    if (err.code === 11000) {
        let field = Object.keys(err.keyValue || {})[0];
        if (field in DUPLICATE_MESSAGES)
            return res.json({ errors: { [field]: { message: DUPLICATE_MESSAGES[field] } } });
    }

    sendServerError(res, err);
};

exports.createUser = (req, res, next) => {
    if (!passwordUtils.isValidPassword(req.body.password))
        return res
            .status(400)
            .json({ errors: { password: { message: passwordUtils.PASSWORD_POLICY_MSG } } });

    passwordUtils
        .cryptPassword(req.body.password)
        .then((resPassword) => {
            // Only pick the fields a user may set, so `activated`, `hasShotgun`, `room`... can't be forged
            let newUserInfo = {
                email: req.body.email,
                username: req.body.username,
                password: resPassword,
            };

            let newUser = new User(newUserInfo);

            User.findOne({ email: String(newUserInfo.email) }).then(
                (user) => {
                    if (!user) {
                        newUser.save().then(
                            (user) => {
                                console.log("Created user " + newUserInfo.email);
                                req.activator = { id: user.id };
                                next();
                            },
                            (err) => sendSaveError(res, err),
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
                (err) => sendServerError(res, err),
            );
        })
        .catch((err) => sendServerError(res, err));
};

exports.createActivateHandler = function (req, res, next) {
    // the header is not normally set, so we know we incurred the handler
    res.set("activator", "createActivateHandler");
    res.status(201).send({});
};

// The activator "Next" handlers always call next(), even when they failed: their outcome is in
// req.activator ({ code, message }) and must be checked before answering
const activatorSucceeded = (req) => req.activator && req.activator.code < 300;

// Errors activator gives for a wrong, tampered or expired activation / reset code
const INVALID_CODE_ERRORS = ["invalidactivationcode", "invalidresetcode", "expiredresetcode"];
const isInvalidCode = (message) =>
    message === "invalidcode" ||
    message instanceof jwt.JsonWebTokenError ||
    INVALID_CODE_ERRORS.includes(message?.message);

// Answers the error of a failed activator step: an invalid or expired link, a refused password,
// an unknown user, or a server error (e.g. the mail couldn't be sent)
const sendActivatorError = (res, activator) => {
    if (activator.message === "badpassword" || activator.message === "missingpassword") {
        console.warn("Password refused: " + activator.message);
        return res
            .status(400)
            .json({ errors: { password: { message: passwordUtils.PASSWORD_POLICY_MSG } } });
    }
    if (activator.code === 404) {
        console.warn("Activation or password reset refused: unknown user");
        return res.status(404).json({ message: labels.FAILED_AUTH_NO_USER_MSG });
    }
    if (isInvalidCode(activator.message)) {
        console.warn("Activation or password reset refused: invalid or expired link");
        return res.status(400).json({ message: labels.INVALID_LINK_MSG });
    }

    sendServerError(res, activator.message);
};

exports.afterCompleteActivation = (req, res) => {
    // without this check, any code activated the account and logged in as its owner
    if (!activatorSucceeded(req)) return sendActivatorError(res, req.activator || {});

    User.findById(req.params.user)
        .then((user) => {
            console.log("Activated user " + user.email);
            fillUserAndTokens(user, res);
        })
        .catch((err) => {
            sendServerError(res, err);
        });
};

exports.readUser = (req, res) => {
    User.findById(req.params.userId)
        .then((user) => {
            res.json({
                username: user.username,
                activated: user.activated,
            });
        })
        .catch((err) => {
            sendServerError(res, err);
        });
};

// The connected user, with the rights the front needs to know about (the back still checks them)
exports.readMe = (req, res) => {
    User.findOne({ email: String(req.user.email) })
        .then((user) => {
            if (!user) return res.status(404).json({ message: labels.FAILED_AUTH_NO_USER_MSG });

            res.json({
                username: user.username,
                email: user.email,
                activated: user.activated,
                isAdmin: user.isAdmin,
            });
        })
        .catch((err) => sendServerError(res, err));
};

exports.beforeCreatePasswordReset = (req, res, next) => {
    User.findOne({ email: String(req.body.email) }).then(
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
            sendServerError(res, err);
        },
    );
};

exports.afterCreatePasswordReset = (req, res) => {
    if (!activatorSucceeded(req)) return sendActivatorError(res, req.activator || {});

    console.log("Password reset requested for user " + req.params.user.username);
    res.status(200).json({});
};

exports.afterCompletePasswordReset = (req, res) => {
    if (!activatorSucceeded(req)) return sendActivatorError(res, req.activator || {});

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
        true,
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
    User.find({}, { password: 0, email: 0, __v: 0 })
        .then((users) => {
            res.status(200).send({
                meta: {
                    code: "200",
                },
                data: users,
            });
        })
        .catch((err) => sendServerError(res, err));
};
