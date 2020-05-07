let mongoose = require("mongoose"),
    Trip = mongoose.model("Trips");


exports.getTrips = (callback, errCallback = (() => {})) => {
    Trip.find({}).then(callback).catch(errCallback)
};

exports.serializeTrip = (trip) => `At ${trip.date} from ${trip.location}`;
