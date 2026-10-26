let mongoose = require("mongoose"),
    Shotgun = mongoose.model("Shotguns"),
    User = mongoose.model("Users"),
    Room = mongoose.model("Rooms"),
    tokenUtils = require("../../utils/token"),
    shotgunComplete = require("./shotgunCompleteController"),
    userHelper = require("../../user/userController/userHelperController"),
    roomHelper = require("../../room/roomController/roomHelperController"),
    shotgunHelper = require("./shotgunHelperController"),
    saveShotgun = require("./shotgunSaveController"),
    shotgunUsers = require("./shotgunUsersController"),
    shotgunErrors = require("../shotgunErrors"),
    userErrors = require("../../user/userErrors"),
    errors = require("../../utils/errors"),
    timeout = require("./timeoutController"),
    async = require("async");

const isObjectId = (value) => typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);

let sendBadParameter = (res, message) =>
    res.status(400).send({
        meta: {
            error_type: "Error 400 : Query parameter error",
            code: "400",
            error_message: message,
        },
    });

// Handle Shotgun create on POST.
exports.shotgunCreatePost = (req, res) => {
    // Validate Request
    let user = undefined;
    let accessToken = tokenUtils.getJWTToken(req.headers);

    // check user is authenticated
    tokenUtils.checkAccessToken(
        accessToken,
        (err, decode) => {
            user = decode;
        },
        false,
    );

    if (!user) {
        console.error("-> Shotgun create aborted. Invalid token.");
        return res.status(401).json({ message: "Authentication failed. Invalid accessToken." });
    }

    // check room query parameter
    if (!req.params.roomId) {
        console.error("-> Room query parameter is empty.");
        return res.status(400).send({
            meta: {
                error_type: "Error 400 : Query parameter error",
                code: "400",
                error_message: "Room query parameter can not be empty",
            },
        });
    }

    // check roomId is an ObjectId
    if (!req.params.roomId.match(/^[0-9a-fA-F]{24}$/)) {
        console.error("-> Room query parameter not ObjectID.");
        return res.status(400).send({
            meta: {
                error_type: "Error 400 : Query parameter error",
                code: "400",
                error_message: "RoomID not an Object ID (Cast Error)",
            },
        });
    }

    // Create shotgun
    async.waterfall(
        [
            (callback) => {
                async.parallel(
                    [
                        // check that user exists and hasn't already shotgun
                        (callback) => {
                            userHelper.checkUserOK(user.email, (err, user) => {
                                if (err) {
                                    console.error("-> Error check user.");
                                    return callback(err);
                                }
                                console.log("... User OK.");
                                callback(null, user._id);
                            });
                        },
                        //Check room exists, has space available (minimum 1 place for the owner) and not already associated to a shotgun
                        (callback) => {
                            async.parallel(
                                [
                                    (callback) => {
                                        roomHelper.checkRoomReadyForShotgun(
                                            req.params.roomId,
                                            1,
                                            (err, room) => {
                                                if (err) return callback(err);
                                                callback(null, room);
                                            },
                                        );
                                    },
                                    (callback) => {
                                        shotgunHelper.checkRoomNotShotgun(
                                            req.params.roomId,
                                            (err) => {
                                                if (err) {
                                                    console.error(
                                                        "-> Error check room not shotgun.",
                                                    );
                                                    return callback(err);
                                                }
                                                callback();
                                            },
                                        );
                                    },
                                ],
                                callback,
                            );
                        },
                    ],
                    (err, results) => {
                        if (err) {
                            console.error("-> Error before saving to DB.");
                            return callback(err);
                        }
                        console.log("... Room OK.");
                        callback(null, results); // results contains the owner userId and the room
                    },
                );
            },
            (results, callback) => {
                // Save shotgun in DB
                saveShotgun.savePreShotgun(results[0], results[1][0], (err, shotgun) => {
                    if (err) {
                        console.error("-> Shotgun saving error.");
                        return callback(err);
                    }
                    callback(null, shotgun);
                });
            },
        ],
        (err, shotgun) => {
            if (err) {
                if (!err.httpStatusCode) return errors.sendServerError(res, err);
                return res.status(Number(err.httpStatusCode)).send({
                    meta: {
                        error_type: err.name,
                        code: err.httpStatusCode,
                        error_message: err.message,
                    },
                });
            }
            console.log("... Shotgun is created.");

            // set a timeout that checks after a certain time if the created shotgun has been finalised in the meantime
            timeout.setShotgunTimeout(shotgun);

            return res.status(200).send({
                meta: {
                    code: "200",
                    desc: "Shotgun created successfully!",
                },
                data: shotgun,
            });
        },
    );
};

// Handle Shotgun delete.
exports.shotgunDelete = (req, res) => {
    // Validate Request
    let user = undefined;
    let accessToken = tokenUtils.getJWTToken(req.headers);

    // check user is authenticated
    tokenUtils.checkAccessToken(
        accessToken,
        (err, decode) => {
            user = decode;
        },
        false,
    );

    if (!user) {
        console.error("-> Shotgun delete aborted. Invalid token.");
        return res.status(401).json({ message: "Authentication failed. Invalid accessToken." });
    }

    if (!req.params.roomId) {
        return res.status(400).send({
            meta: {
                error_type: "Error 400 : Query parameter error",
                code: "400",
                error_message: "RoomId query parameter can not be empty",
            },
        });
    }

    if (!isObjectId(req.params.roomId)) return sendBadParameter(res, "RoomId is not an ObjectId");

    let sendError = (err) => {
        if (!err.httpStatusCode) return errors.sendServerError(res, err);
        res.status(Number(err.httpStatusCode)).send({
            meta: {
                error_type: err.name,
                code: err.httpStatusCode,
                error_message: err.message,
            },
        });
    };

    console.log("Deleting Shotgun...");
    Promise.all([User.findOne({ email: user.email }), Shotgun.findOne({ room: req.params.roomId })])
        .then(([owner, shotgun]) => {
            if (!owner) throw userErrors.getUserNotFoundError("email", user.email);
            if (!shotgun) throw shotgunErrors.getShotgunNotFoundError(req.params.roomId);

            // only the owner can delete their shotgun, checked again in the delete query so a
            // shotgun expired and taken by someone else in the meantime is kept
            let forbidden = new Error(
                "User " + owner.username + " doesn't own the shotgun. Delete forbidden",
            );
            forbidden.name = "Error 403 : Forbidden";
            forbidden.httpStatusCode = "403";
            if (String(owner._id) !== String(shotgun.user)) throw forbidden;

            return Shotgun.findOneAndDelete({ _id: shotgun._id, user: owner._id }).then(
                (deletedShotgun) => {
                    if (!deletedShotgun)
                        throw shotgunErrors.getShotgunNotFoundError(req.params.roomId);

                    timeout.clearShotgunTimeout(deletedShotgun);
                    return shotgunUsers.freeUsers(
                        [deletedShotgun.user, ...deletedShotgun.roommates],
                        deletedShotgun.room,
                    );
                },
            );
        })
        .then(() => {
            console.log("... Shotgun deleted.");
            res.send({
                meta: {
                    code: "200",
                    desc: "Shotgun deleted successfully!",
                },
            });
        })
        .catch((err) => {
            console.error("-> Error while deleting the shotgun: " + err);
            sendError(err);
        });
};

// Display list of all shotguned rooms.
exports.roomList = (req, res) => {
    Shotgun.find({}, { __v: 0 })
        .populate("room", { __v: 0 })
        .exec()
        .then(
            (foundShotguns) => {
                res.status(200).send({
                    meta: {
                        code: "200",
                    },
                    data: foundShotguns,
                });
            },
            (err) => errors.sendServerError(res, err),
        );
};

// Handle roommates addition to shotgun on PUT.
exports.roommatesAdd = (req, res, next) => {
    // Validate Request
    let user = undefined;
    let accessToken = tokenUtils.getJWTToken(req.headers);

    // check user is authenticated
    tokenUtils.checkAccessToken(
        accessToken,
        (err, decode) => {
            user = decode;
        },
        false,
    );

    if (!user) {
        console.error("-> Shotgun add roommates aborted. Invalid token.");
        return res.status(401).json({ message: "Authentication failed. Invalid accessToken." });
    }

    if (!req.body.roommates) {
        return res.status(400).send({
            meta: {
                error_type: "Error 400 : Query parameter error",
                code: "400",
                error_message: "Roommates query parameter can not be empty",
            },
        });
    }

    if (!req.params.roomId) {
        return res.status(400).send({
            meta: {
                error_type: "Error 400 : Query parameter error",
                code: "400",
                error_message: "RoomId query parameter can not be empty",
            },
        });
    }

    if (!isObjectId(req.params.roomId)) return sendBadParameter(res, "RoomId is not an ObjectId");

    // The roommates are iterated and saved one by one, so reject anything but a list of distinct user ids
    let roommates = req.body.roommates;
    if (
        !Array.isArray(roommates) ||
        !roommates.every(isObjectId) ||
        new Set(roommates).size !== roommates.length
    )
        return sendBadParameter(res, "Roommates must be a list of distinct user ids");

    /* Add roommates */
    let updateUsers = req.body.roommates;

    async.waterfall(
        [
            (callback) => {
                // find room and check that the number of users (roommates + user owner) isn"t exceeding the number of beds
                roomHelper.checkRoomReadyForShotgun(
                    req.params.roomId,
                    updateUsers.length + 1,
                    callback,
                );
            },
            (room, callback) => {
                // find the shotgun
                shotgunHelper.findShotgun(req.params.roomId, callback);
            },

            // Check and update the owner user and the roommates
            (shotgun, callback) => {
                // shotgun all users
                shotgunUsers.shotgunUsers(shotgun, user, updateUsers, req.params.roomId, callback);
            },
            // complete shotgun
            (roommatesId, callback) => {
                // Find shotgun and update it with the request query
                shotgunComplete.completeShotgun(req.params.roomId, roommatesId, callback);
            },
            // retrieve the complete shotgun and populate all its fields
            (shotgun, callback) => {
                Shotgun.findById(shotgun._id, { __v: 0 })
                    .populate("room", { __v: 0 })
                    .populate("user", {
                        password: 0,
                        __v: 0,
                    })
                    .populate("roommates", { password: 0, email: 0, __v: 0 })
                    .exec()
                    .then(
                        (populatedShotgun) => {
                            callback(null, populatedShotgun);
                        },
                        (err) => {
                            return callback(
                                errors.getServerError(
                                    "Couldn't populate shotgun " + shotgun._id + ".",
                                ),
                            );
                        },
                    );
            },
        ],
        (err, shotgun) => {
            if (err) {
                if (err.kind === "ObjectId") {
                    return res.status(404).send({
                        meta: {
                            error_type: "Error 404 : Not found",
                            code: "404",
                            error_message: "Shotgun not found with id " + req.params.roomId,
                        },
                    });
                } else if (!err.httpStatusCode) return errors.sendServerError(res, err);
                else
                    return res.status(Number(err.httpStatusCode)).send({
                        meta: {
                            error_type: err.name,
                            code: err.httpStatusCode,
                            error_message: err.message,
                        },
                    });
            }
            timeout.clearShotgunTimeout(shotgun);
            shotgunComplete.afterCompleteShotgun(shotgun);

            res.send({
                meta: {
                    code: "200",
                    desc: "Shotgun complete",
                },
                data: shotgun,
            });
        },
    );
};
