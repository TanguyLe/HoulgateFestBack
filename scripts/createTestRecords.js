#! /usr/bin/env node

let async = require("async");

let User = require("../api/user/userModel");

let passwordUtils = require("../api/utils/password"),
    scriptsUtils = require("./scriptsUtils"),
    mongoDB = scriptsUtils.getMongoDbUriFromEnv(),
    mongooseConnection = scriptsUtils.connectToDb(mongoDB),
    getSaveCallBack = scriptsUtils.getSaveCallback,
    mainCallback = scriptsUtils.getMainCallback(mongooseConnection);

console.log(
    "This script populates the database with a few test records. (users)." +
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

async.series([createTestUsers], mainCallback);
