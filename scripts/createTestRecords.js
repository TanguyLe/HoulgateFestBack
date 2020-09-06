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

let createTestUsers = (callback) => {
    console.log("\nCreating test users.");

    async.parallel(
        async.reflectAll(
            scriptsUtils.testUsers.map((user) => (cb) =>
                new User({
                    username: user[0],
                    email: user[1],
                    password: passwordUtils.cryptPasswordSync(user[2]),
                    activated: user[3],
                }).save(getSaveCallBack("User", cb, "username"))
            )
        ),
        callback
    );
};

const createTestTrips = (callback) => {
    console.log("\nCreating test trips.");

    async.waterfall(
        [
            (cb) =>
                User.find({ username: { $in: scriptsUtils.testUsers.map((user) => user[0]) } }, cb),
            (users, cb) =>
                async.parallel(
                    async.reflectAll(
                        scriptsUtils.testTrips.map((trip, index) => (cb) =>
                            new Trip({
                                date: trip[0],
                                driver: users[index],
                                passengers: [users[index], users[index + 1]],
                                location: trip[1],
                                seats: trip[2],
                                type: trip[3],
                            }).save(getSaveCallBack("Trip", cb, serializeTrip))
                        )
                    ),
                    cb
                ),
        ],
        callback
    );
};

async.series(async.reflectAll([createTestUsers, createTestTrips]), mainCallback);
