let mongoose = require("mongoose"),
    Trip = mongoose.model("Trips");


exports.getTrips = (callback, errCallback = (() => {})) => {
    Trip.find({}, {__v: 0}).then(callback).catch(errCallback)
};
