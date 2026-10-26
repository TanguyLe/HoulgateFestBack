let mongoose = require("mongoose"),
    tokenUtils = require("./token"),
    labels = require("../../labels"),
    editionController = require("../edition/editionController"),
    { sendServerError } = require("./errors");

exports.userAuth = (req, res, next) => {
    req.user = null;

    if (req.headers) {
        let accessToken = tokenUtils.getJWTToken(req.headers);

        if (accessToken)
            tokenUtils.checkAccessToken(
                accessToken,
                (err, decode) => {
                    if (!err) req.user = decode;
                },
                false
            );
    }

    if (req.user !== null) next();
    else res.status(401).send({ message: labels.FAILED_AUTH_INVALID_CRED_MSG });
};

// Admin rights are read from the DB on each request, not from the token, so removing them applies at once
exports.adminAuth = (req, res, next) => {
    mongoose
        .model("Users")
        .findOne({ email: String(req.user.email) })
        .then((user) => {
            if (user && user.activated && user.isAdmin) {
                req.admin = user;
                next();
            } else res.status(403).send({ message: labels.ADMIN_ONLY_MSG });
        })
        .catch((err) => sendServerError(res, err));
};

exports.hasStarted = (req, res, next) => {
    if (process.env.HAS_STARTED === "1") next();
    else {
        editionController.getEditions(
            (editions) => {
                const currentEdition = editionController.getCurrentEditionFromEditions(editions);
                if (currentEdition !== undefined && new Date() > currentEdition.shotgunDate) next();
                else res.status(400).send({ message: "Shotgun has not started yet" });
            },
            // without this the request never got an answer when the editions couldn't be read
            (err) => sendServerError(res, err)
        );
    }
};

exports.notFound = (req, res) => {
    res.status(404).send({ url: req.originalUrl + " not found" });
};
