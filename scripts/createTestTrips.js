#! /usr/bin/env node

let scriptsUtils = require("./scriptsUtils");

console.log("This script populates the database with a few test trips.");

let async = require("async");
let User = require("../api/user/userModel");
let Trip = require("../api/trip/tripModel");

let mongoDB = scriptsUtils.getMongoDbFromArgs();
let mongooseConnection = scriptsUtils.connectToDb(mongoDB);

const createTrip = (date, location, seats, type, driver, passengers, cb) => {
    let trip = new Trip({
        date: date,
        driver: driver,
        passengers: passengers,
        location: location,
        seats: seats,
        type: type
    });

    trip.save((err) => {
        if (err) {
            cb(err);
            return;
        }

        console.log("New Trip the: " + trip.date);
        cb(null);
    });
};

const fetchUsers = (callback) => User.find({}, callback);

const createTrips = (users, callback) => {
    async.parallel(scriptsUtils.testTrips.map(
        (trip, index) => (
            (cb) => createTrip(
                ...trip,
                users[index],
                [users[index], users[index + 1]],
                cb
            ))),
        callback);
};

async.waterfall([fetchUsers, createTrips],
    (err) => {
        if (err)
            console.log("FINAL ERR: " + err);

        // All done, disconnect from database
        mongooseConnection.close();
    });
