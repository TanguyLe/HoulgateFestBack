let mongoose = require("mongoose"),
    Shotgun = mongoose.model("Shotguns"),
    User = mongoose.model("Users"),
    async = require("async");

// A pre-shotgun not completed within this delay is deleted and its room freed
const SHOTGUN_TIMEOUT_MS = 2 * 60 * 1000;

let tuttimer = {};

// Set a timeout linked to a shotgun
exports.setShotgunTimeout = (shotgun) => {
    tuttimer[shotgun._id] = setTimeout(
        this.shotgunTimeoutTriggered.bind(null, shotgun),
        SHOTGUN_TIMEOUT_MS,
    );
};

// Clear a timeout related to a shotgun
exports.clearShotgunTimeout = (shotgun) => {
    clearTimeout(tuttimer[shotgun._id]);
};

// Delete the shotgun if it's still a pre-shotgun and free its owner.
// The status is part of the delete query so a shotgun completed in the meantime is kept.
let expireShotgun = (shotgun, callback) => {
    Shotgun.findOneAndDelete({ _id: shotgun._id, status: "preShotgunned" })
        .then((deletedShotgun) => {
            if (!deletedShotgun) return callback();

            console.log("Deleting expired pre-shotgun on room " + deletedShotgun.room + "...");
            return User.findByIdAndUpdate(deletedShotgun.user, {
                hasShotgun: false,
                hasPreShotgun: false,
                room: null,
            }).then(() => {
                console.log("...shotgun on room " + deletedShotgun.room + " deleted.");
                callback();
            });
        })
        .catch((err) => {
            console.error("-> Error while expiring shotgun " + shotgun._id + " : " + err);
            callback(err);
        });
};

// Delete shotgun not completed after a timeout
exports.shotgunTimeoutTriggered = (shotgun) => {
    console.log("Timeout triggered for shotgun on room " + shotgun.room._id);
    expireShotgun(shotgun, () => {});
};

// The timers above live in the server's memory and are lost when a serverless instance stops,
// so expired pre-shotguns are also cleaned up whenever the shotgun routes are called
exports.expireStaleShotguns = (req, res, next) => {
    Shotgun.find({
        status: "preShotgunned",
        createdAt: { $lt: new Date(Date.now() - SHOTGUN_TIMEOUT_MS) },
    })
        .then((staleShotguns) => {
            async.each(staleShotguns, expireShotgun, () => next());
        })
        .catch((err) => {
            console.error("-> Error while looking for expired shotguns : " + err);
            next();
        });
};
