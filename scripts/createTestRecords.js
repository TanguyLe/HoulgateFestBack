#! /usr/bin/env node

let async = require("async");

let User = require("../api/user/userModel"),
    Trip = require("../api/trip/tripModel");

let serializeTrip = require("../api/trip/tripController").serializeTrip;

let passwordUtils = require("../api/utils/password"),
    scriptsUtils = require("./scriptsUtils"),
    mongoDB = scriptsUtils.getMongoDbUriFromEnv(),
    mongooseConnection = scriptsUtils.connectToDb(mongoDB),
    getSaveCallBack = scriptsUtils.getSaveCallback,
    mainCallback = scriptsUtils.getMainCallback(mongooseConnection);

console.log(
    "This script populates the database with a few test records. (users and trips)." +
        " It will fail if the DB is not accessible and log if a record is already present. \n"
);

let createTestUsers = async function () {
    console.log("\nCreating test users.");

    console.log("Test users nb : " + scriptsUtils.testUsers.length);

    const usersPromises = scriptsUtils.testUsers.map(async (user) => {
        const newuser = new User({
            username: user[0],
            email: user[1],
            password: passwordUtils.cryptPasswordSync(user[2]),
            activated: user[3],
        });
        newuser.save().then(
            (savedItem) => {
                getSaveCallBack("User", "username", savedItem);
            },
            (err) => {
                console.error(`Error creating test user ${user[0]} because of: ${err}`);
                throw new Error(err);
            }
        );
    });
    await Promise.all(usersPromises);
};

let createTestTrips = async function () {
    console.log("\nCreating test trips.");

    const users = await User.find({
        username: { $in: scriptsUtils.testUsers.map((user) => user[0]) },
    });

    const tripPromises = scriptsUtils.testTrips.map(async (trip, index) => {
        const driver = users[index];
        const passengers = [users[index], users[index + 1]];
        const location = trip[1];
        const seats = trip[2];
        const type = trip[3];
        const newTrip = new Trip({ date: trip[0], driver, passengers, location, seats, type });
        await newTrip.save().then(
            (savedItem) => {
                getSaveCallBack("Trip", serializeTrip, savedItem);
            },
            (err) => {
                console.error(`Error creating test trip because of: ${err}`);
                throw new Error(err);
            }
        );
    });
    await Promise.all(tripPromises);
};

async.series([createTestUsers, createTestTrips], mainCallback);
