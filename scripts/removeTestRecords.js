#! /usr/bin/env node

let async = require("async");

let User = require("../api/user/userModel"),
    Shotgun = require("../api/shotgun/shotgunModel"),
    Trip = require("../api/trip/tripModel");

let serializeTrip = require("../api/trip/tripController").serializeTrip;

let scriptsUtils = require("./scriptsUtils"),
    mongoDB = scriptsUtils.getMongoDbUriFromEnv(),
    mongooseConnection = scriptsUtils.connectToDb(mongoDB),
    mainCallback = scriptsUtils.getMainCallback(mongooseConnection),
    getRemoveCallback = scriptsUtils.getRemoveCallback,
    getDeleteManyCallback = scriptsUtils.getDeleteManyCallback,
    getUpdateManyCallback = scriptsUtils.getUpdateManyCallback,
    testUsernames = scriptsUtils.testUsers.map((user) => user[0]);

console.log(
    "This script cleans the database from the test records. " +
        "(test users, test trips and test user's shotguns)." +
        " It will fail if the DB is not accessible. \n"
);

const isTestTrip = (trip) => testUsernames.includes(trip.driver.username);
const isTestShotgun = (shotgun) => testUsernames.includes(shotgun.user.username);

const deleteTestUsersShotguns = (callback) => {
    console.log("\nDeleting test users' shotguns if any.");

    async.waterfall(
        [
            (cb) => Shotgun.find({}, cb).populate("user"),
            (shotguns, cb) => {
                const testShotguns = shotguns.filter((shotgun) => isTestShotgun(shotgun));

                async.parallel(
                    async.reflectAll(
                        testShotguns.map((shotgun) => (cb) =>
                            shotgun.remove(getRemoveCallback("Shotgun", cb))
                        )
                    ),
                    cb
                );
            },
            (_, cb) =>
                User.updateMany(
                    { username: { $in: testUsernames } },
                    {
                        $set: {
                            hasShotgun: false,
                            hasPreShotgun: false,
                            room: null,
                        },
                    },
                    getUpdateManyCallback("\nTest users " + testUsernames.join(", "), cb)
                ),
        ],
        callback
    );
};

const deleteTestUsersTrips = (callback) => {
    console.log("\nDeleting test users' trips if any.");

    async.waterfall(
        [
            (cb) => Trip.find({}, cb).populate("driver"),
            (trips, cb) => {
                const testTrips = trips.filter((trip) => isTestTrip(trip));

                async.parallel(
                    async.reflectAll(
                        testTrips.map((trip) => (cb) =>
                            trip.remove(getRemoveCallback("Trip", cb, serializeTrip))
                        )
                    ),
                    cb
                );
            },
        ],
        callback
    );
};

const deleteTestUsers = (callback) => {
    User.deleteMany(
        { username: { $in: testUsernames } },
        getDeleteManyCallback("\nTest users " + testUsernames.join(", "), callback)
    );
};

const seriesFull = [
    (cb) => async.parallel(async.reflectAll([deleteTestUsersShotguns, deleteTestUsersTrips]), cb),
    deleteTestUsers,
];

async.series(
    process.argv.slice(2).includes("shotgunOnly") ? [deleteTestUsersShotguns] : seriesFull,
    mainCallback
);
