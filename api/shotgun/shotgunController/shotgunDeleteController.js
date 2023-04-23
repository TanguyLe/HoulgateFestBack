let mongoose = require("mongoose"),
    Room = mongoose.model("Rooms"),
    Shotgun = mongoose.model("Shotguns"),
    User = mongoose.model("Users"),
    timeout = require("./timeoutController"),
    async = require("async");

// Delete all shotguns own by the specified users
exports.deleteShotguns = (usersId, callback) => {
    console.log("Deleting shotguns own by the roommates...");
    let stackDeleteShotguns = [];
    usersId.forEach((item) => {
        // delete shotgun -> can't use deleteMany cause need a ref to a specific shotgun to clear the timeout
        let deleteShotgun = (callback) => {
            Shotgun.findOneAndRemove({ user: item })
                .then((deletedShotgun) => {
                    if (!deletedShotgun) return callback();

                    // The user owned a room before
                    console.log(
                        "Shotgun associated to user with id " + item + " has been deleted."
                    );

                    timeout.clearShotgunTimeout(deletedShotgun); // remove the timeout that checks if the shotgun has been finalised

                    User.findById(item)
                        .then((user) => async () => {
                            // if the user is still linked to the deleted shotgun's room
                            if (String(user.room) === String(deletedShotgun.roomId)) {
                                user.room = null;
                            }
                            user.hasPreShotgun = false; // the user doesn't own a room anymore

                            await user
                                .save()
                                .then((user) => {
                                    console.log(
                                        "User " + user.username + " doesn't own a room anymore."
                                    );
                                    return callback();
                                })
                                .catch((err) => {
                                    console.error(
                                        "-> User " + user.username + " could not be updated."
                                    );
                                    return callback(
                                        errors.getServerError("Couldn't save " + user.username)
                                    );
                                });
                        })
                        .catch((err) => {
                            return callback(err);
                        });
                })
                .catch((err) => {
                    return callback(err);
                });
        };
        stackDeleteShotguns.push(deleteShotgun);
    });

    async.parallel(stackDeleteShotguns, (err, result) => {
        if (err) {
            console.error("-> Error while deleting shotguns own by the roommates : " + err);
            let error = new Error("Error while deleting shotguns.");
            error.name = "Error 500 : Internal Server Error";
            error.httpStatusCode = "500";
            return callback(error);
        }
        console.log("... All shotguns associated to roommates, if any, deleted successfully.");
        return callback();
    });
};
