let mongoose = require("mongoose"),
    Room = mongoose.model("Rooms"),
    Shotgun = mongoose.model("Shotguns"),
    User = mongoose.model("Users"),
    userErrors = require("../../user/userErrors"),
    shotgunComplete = require("./shotgunCompleteController"),
    async = require("async");

// Save shotgun in DB
exports.savePreShotgun = (userId, room, callback) => {
    console.log("Saving shotgun...");
    let roomId = room._id;
    const shotgun = new Shotgun({ room: roomId, user: userId });

    async.waterfall(
        [
            // Save in DB
            (callback) => {
                shotgun
                    .save()
                    .then((shotgun) => {
                        console.log("...preShotgun saved.");
                        callback(null, shotgun);
                    })
                    .catch((err) => {
                        // duplicate key: a concurrent request got this room or this user first
                        if (err.code === 11000) {
                            let error = new Error("Room already shotgun or user already owns one.");
                            error.name = "Error 409 : Conflict";
                            error.httpStatusCode = "409";
                            return callback(error);
                        }
                        callback(err);
                    });
            },
            // Update the user owner of the shotgun
            (shotgun, callback) => {
                console.log("Update owner user...");

                // complete first the shotgun if only one bed in the room (room full with user owner)
                if (String(room.nbBeds) === "1") {
                    shotgunComplete.completeShotgun(roomId, null, (err, shotgun) => {
                        if (err) return callback(err);

                        User.findByIdAndUpdate(
                            shotgun.user,
                            {
                                hasShotgun: true,
                                hasPreShotgun: true,
                                room: roomId,
                            },
                            { new: true }
                        )
                            .then((foundUser) => {
                                if (!foundUser)
                                    return callback(
                                        userErrors.getUserNotFoundError("id", shotgun.user)
                                    );

                                console.log("...User " + foundUser.username + " is updated.");
                                callback(null, shotgun);
                            })
                            .catch((err) => {
                                return callback(err);
                            });
                    });
                } else {
                    User.findByIdAndUpdate(
                        shotgun.user,
                        {
                            hasPreShotgun: true,
                            room: roomId,
                        },
                        { new: true }
                    )
                        .then((foundUser) => {
                            if (!foundUser)
                                return callback(
                                    userErrors.getUserNotFoundError("id", shotgun.user)
                                );

                            console.log("...User " + foundUser.username + " is updated.");
                            callback(null, shotgun);
                        })
                        .catch((err) => {
                            callback(err);
                        });
                }
            },
            // retrieve the full shotgun
            (shotgun, callback) => {
                Shotgun.findById(shotgun._id, { __v: 0 })
                    .populate("room", { __v: 0 })
                    .populate("user", {
                        password: 0,
                        __v: 0,
                    })
                    .exec()
                    .then((foundShotgun) => {
                        callback(null, foundShotgun);
                    })
                    .catch((err) => {
                        callback(err);
                    });
            },
        ],
        (err, shotgun) => {
            if (err) return callback(err);
            callback(null, shotgun);
        }
    );
};
