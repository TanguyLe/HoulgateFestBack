let mongoose = require("mongoose"),
    Trip = mongoose.model("Trips");


exports.getTrips = (callback, errCallback = (() => {})) => {
    Trip.find({}).then(callback).catch(errCallback)
};

exports.createTrip = (tripData, callback, errCallback = (() => {})) => {
        if (tripData.passengers.length > tripData.seats)
            errCallback({message: "More passengers than seats.", code: 400});
        else
            (new Trip(tripData)).save().then(callback).catch(errCallback);
};

exports.serializeTrip = (trip) => `At ${trip.date} from ${trip.location}`;
