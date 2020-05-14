let mongoose = require("mongoose"),
    Trip = mongoose.model("Trips");


const validateTrip = (tripData) => {
    if (tripData.passengers.length > tripData.seats)
        return {message: "More passengers than seats.", code: 400};
};

exports.getTrips = (callback, errCallback = (() => {})) => {
    Trip.find({}).then(callback).catch(errCallback)
};

exports.createTrip = (tripData, callback, errCallback = (() => {})) => {
        const err = validateTrip(tripData);
        if (err)
            errCallback(err);

        (new Trip(tripData)).save().then(callback).catch(errCallback);
};

exports.updateTrip = (tripId, tripData, callback, errCallback = (() => {})) => {
    const err = validateTrip(tripData);
    if (err)
        errCallback(err);

    Trip.findByIdAndUpdate(tripId, tripData, {new: true}).then(callback).catch(errCallback);
};

exports.deleteTrip = (tripId, callback, errCallback = (() => {})) => {
    Trip.findByIdAndRemove(tripId).then(callback).catch(errCallback);
};


exports.serializeTrip = (trip) => `At ${trip.date} from ${trip.location}`;
