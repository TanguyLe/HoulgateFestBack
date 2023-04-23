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

const isTestTrip = (trip) => trip.driver && testUsernames.includes(trip.driver.username);
const isTestShotgun = (shotgun) => testUsernames.includes(shotgun.user.username);

const deleteTestUsersShotguns = async () => {
    console.log("\nDeleting test users' shotguns if any.");

    try {
        const shotguns = await Shotgun.find({}).populate("user");
        const testShotguns = shotguns.filter((shotgun) => isTestShotgun(shotgun));

        await Promise.all(testShotguns.map((shotgun) => shotgun.deleteOne()));

        let result = await User.updateMany(
            { username: { $in: testUsernames } },
            {
                $set: {
                    hasShotgun: false,
                    hasPreShotgun: false,
                    room: null,
                },
            }
        );
        getUpdateManyCallback("\nTest users " + testUsernames.join(", "), result);
    } catch (error) {
        console.error(`${error}`);
        throw error;
    }
    console.log("\n-> Remove test shotguns finished.");
};

const deleteTestUsersTrips = async () => {
    console.log("\nDeleting test users' trips if any.");

    try {
        const trips = await Trip.find({}).populate("driver");
        console.log("Total of " + trips.length + " trips");
        trips.map((trip) => {
            const driver = trip.driver;
            if (driver) console.log("Found driver " + driver.username);
        });
        const testTrips = trips.filter((trip) => isTestTrip(trip));
        console.log("Remove " + testTrips.length + " trips from DB");

        await Promise.all(
            testTrips.map((trip) =>
                trip
                    .deleteOne()
                    .then(function (res) {
                        getRemoveCallback("Trip", serializeTrip, trip);
                    })
                    .catch(function (err) {
                        console.log("Error test trips");
                        throw new Error(err);
                    })
            )
        );
        console.log("\n-> Remove test trips finished.");
    } catch {
        (err) => {
            console.log("Error:" + err);
            throw new Error(err);
        };
    }
};

const deleteTestUsers = async () => {
    console.log("\nDeleting test users.");
    try {
        let result = await User.deleteMany({ username: { $in: testUsernames } });
        getDeleteManyCallback("\nTest users " + testUsernames.join(", "), result);
    } catch (error) {
        console.error(`${error}`);
        throw error;
    }
    console.log("\n-> Remove test users finished.");
};

const seriesFull = [
    (cb) => async.parallel(async.reflectAll([deleteTestUsersShotguns, deleteTestUsersTrips]), cb),
    deleteTestUsers,
];

async.series(
    process.argv.slice(2).includes("shotgunOnly") ? [deleteTestUsersShotguns] : seriesFull,
    mainCallback
);
