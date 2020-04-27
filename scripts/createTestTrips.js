#! /usr/bin/env node

let scriptsUtils = require("./scriptsUtils");

console.log("This script populates the database with a few test trips.");

let async = require("async");
let User = require("../api/user/userModel");
let Trip = require("../api/trip/tripModel");

let mongoDB = scriptsUtils.getMongoDbFromArgs();
let mongooseConnection = scriptsUtils.connectToDb(mongoDB);

let createTrip = (date, location, seats, type, driver, passengers, cb) => {
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

let usersList = [];

let fetchUsers = (callback) => {
    User.find({}, (err, res) => {
        usersList = res;
        callback(null);
    });
};

let createTrips = (callback) => {
    async.parallel(scriptsUtils.testTrips.map(
        (trip, index) => ((cb) => createTrip(
            ...trip,
            usersList[index],
            [usersList[index], usersList[index + 1]],
            cb
        ))),
        callback);
};

async.series([fetchUsers, createTrips],
    (err) => {
        if (err)
            console.log("FINAL ERR: " + err);

        // All done, disconnect from database
        mongooseConnection.close();
    });
