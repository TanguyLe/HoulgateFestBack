let mongoose = require("mongoose"),
    Shotgun = mongoose.model("Shotguns"),
    User = mongoose.model("Users"),
    shotgunComplete = require("./shotgunCompleteController"),
    shotgunErrors = require("../shotgunErrors"),
    errors = require("../../utils/errors"),
    async = require("async");

let tuttimer = {};

// Set a timeout of 5 min linked to a shotgun
exports.setShotgunTimeout = (shotgun) => {
    tuttimer[shotgun._id] = setTimeout(this.shotgunTimeoutTriggered.bind(null, shotgun), 120000);
};

// Clear a timeout related to a shotgun
exports.clearShotgunTimeout = (shotgun) => {
    clearTimeout(tuttimer[shotgun._id]);
};

// Delete shotgun not completed after a timeout
exports.shotgunTimeoutTriggered = (shotgun) => {
    console.log("Timeout triggered for shotgun on room " + shotgun.room._id);

    // check if shotgun exists and delete it if shotgun is not completed
    Shotgun.findById(shotgun._id)
        .then((shotgun) => {
            if (!shotgun) {
                console.log("...shotgun is NOT done after timeout. Nothing to be done.");
                return null;
            }
            if (shotgun.status !== "shotgunned") {
                console.log("Deleting Shotgun on room " + shotgun.room + "...");
                // delete shotgun
                let deleteShotgun = (shotgun, callback) => {
                    Shotgun.findByIdAndRemove(shotgun._id)
                        .then((deletedShotgun) => {
                            if (!deletedShotgun)
                                return callback(
                                    shotgunErrors.getShotgunNotFoundError(shotgun.room)
                                );

                            callback(null, deletedShotgun);
                        })
                        .catch((err) => {
                            console.error("-> Shotgun deleting error. (" + err + ")");
                            return callback(
                                errors.getServerError(
                                    "Shotgun with roomId " + shotgun.room + " could not be deleted."
                                )
                            );
                        });
                };

                // roll back the user owner
                let updateUserOwner = (shotgun, callback) => {
                    // special tratment for user owner
                    User.findByIdAndUpdate(shotgun.user, {
                        hasShotgun: false,
                        hasPreShotgun: false,
                        room: null,
                    })
                        .then((user) => {
                            console.log("User " + user.username + " rolled back.");
                            callback();
                        })
                        .catch((err) => {
                            return callback(err);
                        });
                };

                async.parallel(
                    {
                        delete: deleteShotgun.bind(null, shotgun),
                        update: updateUserOwner.bind(null, shotgun),
                    },
                    (err) => {
                        if (err) {
                            console.error("-> Error while deleting from DB.");
                            return;
                        }
                        console.log("...shotgun on room " + shotgun.room + " deleted.");
                    }
                );
            }
        })
        .catch((err) => {
            console.error(err);
        });
};
