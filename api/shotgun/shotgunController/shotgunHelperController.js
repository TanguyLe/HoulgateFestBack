let mongoose = require("mongoose"),
    shotgunErrors = require("../shotgunErrors"),
    Shotgun = mongoose.model("Shotguns");

// Check room isn"t part of any shotgun already
exports.checkRoomNotShotgun = (roomId, callback) => {
    console.log("Check room " + roomId + " not shotgun...");
    Shotgun.findOne({ room: roomId }).then(
        (foundShotgun) => {
            if (foundShotgun) {
                console.error("-> Room " + roomId + " already shotgun.");
                let error = new Error("Room with id " + roomId + " already shotgun.");
                error.name = "Error 400 : Query parameter error";
                error.httpStatusCode = "400";
                return callback(error);
            } else {
                console.log("... Room " + roomId + " not shotgun.");
                return callback();
            }
        },
        (err) => {
            return callback(err);
        }
    );
};

// Retrieve shotgun by roomId
exports.findShotgun = (roomId, callback) => {
    console.log("Find shotgun...");

    Shotgun.findOne({ room: roomId }).then(
        (shotgun) => {
            if (!shotgun) return callback(shotgunErrors.getShotgunNotFoundError(roomId));

            console.log("... Shotgun found.");
            callback(null, shotgun);
        },
        (err) => {
            return callback(err);
        }
    );
};
