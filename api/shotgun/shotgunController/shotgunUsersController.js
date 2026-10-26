let mongoose = require("mongoose"),
    User = mongoose.model("Users"),
    rollback = require("./rollbackController"),
    userError = require("../../user/userErrors"),
    errors = require("../../utils/errors"),
    async = require("async");

let getAlreadyShotgunError = (username) => {
    console.error("-> User " + username + " has already shotgun");
    let error = new Error("User " + username + " has already shotgun.");
    error.name = "Error 409 : Conflict";
    error.httpStatusCode = "409";
    return error;
};

let getNotActivatedError = (username) => {
    console.error("-> User " + username + " is not activated");
    let error = new Error("User " + username + " is not activated.");
    error.name = "Error 403 : Forbidden";
    error.httpStatusCode = "403";
    return error;
};

// Marks the user as shotgun in the room only if they are activated and haven't already shotgun,
// in a single update, so two concurrent shotguns can't both claim the same user
let claimUser = (userId, roomId) =>
    User.findOneAndUpdate(
        { _id: userId, activated: true, hasShotgun: false },
        { hasShotgun: true, room: roomId },
        { returnDocument: "after" },
    );

// Shotgun all users
exports.shotgunUsers = (shotgun, userOwner, updateRoommates, roomId, callback) => {
    console.log("Shotgun all users  ...");

    let stackUpdateUsers = [];
    // users this request marked as shotgun, the only ones to roll back on error
    let claimedUsers = [];

    // Create tasks for checking and updating the users
    // update the user Owner
    let updateUserOwner = (callback) => {
        User.findOne({ email: userOwner.email }).then(
            (user) => {
                if (!user)
                    return callback(userError.getUserNotFoundError("email", userOwner.email));

                // check that only the user owner can update his room
                if (!(String(user._id) === String(shotgun.user))) {
                    console.error(
                        "-> User " +
                            user.username +
                            " doesn't own the shotgun. Can't update the shotgun.",
                    );
                    let error = new Error(
                        "User " + user.username + " doesn't own the shotgun. Update forbidden",
                    );
                    error.name = "Error 403 : Forbidden";
                    error.httpStatusCode = "403";
                    return callback(error);
                }

                claimUser(user._id, roomId)
                    .then((claimedUser) => {
                        if (!claimedUser)
                            return callback(
                                user.activated
                                    ? getAlreadyShotgunError(user.username)
                                    : getNotActivatedError(user.username),
                            );

                        console.log("User " + user.username + " has shotgun.");
                        claimedUsers.push(claimedUser._id);
                        callback();
                    })
                    .catch((err) => {
                        console.error("-> User " + user.username + " could not be udpated.");
                        return callback(errors.getServerError("Couldn't save " + user.username));
                    });
            },
            (err) => {
                return callback(err);
            },
        );
    };

    // update the roommates
    // Intended: the owner picks the roommates without their consent, even ones who own a
    // pre-shotgun (completeShotgun then deletes it). The group agrees on rooms beforehand.
    updateRoommates.forEach((item) => {
        let updateRoommate = (callback) => {
            console.log("Trying to update user:" + item);
            claimUser(item, roomId)
                .then((user) => {
                    if (user) {
                        console.log("User " + user.username + " has shotgun.");
                        claimedUsers.push(user._id);
                        return callback(null, user._id);
                    }

                    // not claimed: either unknown, not activated or already shotgun
                    return User.findById(item).then((user) => {
                        if (!user) return callback(userError.getUserNotFoundError("id", item));
                        if (!user.activated) return callback(getNotActivatedError(user.username));
                        callback(getAlreadyShotgunError(user.username));
                    });
                })
                .catch((err) => {
                    return callback(err);
                });
        };
        stackUpdateUsers.push(updateRoommate);
    });

    // can't use parallel tasks because if a user has shotgun, the remaining users will continue to shotgun while an error
    // would have been thrown and the roolback begun just after, leading to inconsistency.
    async.waterfall(
        [
            updateUserOwner,
            (callback) => {
                async.series(stackUpdateUsers, callback);
            },
        ],
        (error, foundRoommatesId) => {
            if (error) {
                console.error("-> Error before shotgun users : " + error);
                // nothing was changed (e.g. the requester isn't the owner): don't touch anyone
                if (claimedUsers.length === 0) return callback(error);

                // rolling back the users updated by this request
                rollback.rollBackUsers(claimedUsers, roomId, (err) => {
                    if (err) {
                        return callback(err);
                    }
                    let error = new Error("Error caused roll back of all users.");
                    error.name = "Error 400 : Bad request";
                    error.httpStatusCode = "400";
                    return callback(error);
                });
            } else {
                console.log("... All users added successfully.");
                callback(null, foundRoommatesId);
            }
        },
    );
};
