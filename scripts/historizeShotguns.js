#! /usr/bin/env node

let async = require("async");

let Shotgun = require("../api/shotgun/shotgunModel"),
    _1 = require("../api/room/roomModel"),
    User = require("../api/user/userModel"),
    Edition = require("../api/edition/editionModel");

let mongoose = require("mongoose");

let shotgunHistory = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["preShotgunned", "shotgunned"],
            required: true,
            default: "preShotgunned",
        },
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Rooms",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
        },
        roommates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
        edition: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Editions",
            required: true,
        },
    },
    {
        timestamps: true,
        collection: "shotgunsHistory",
    }
);

let ShotgunsHistory = mongoose.model("ShotgunsHistory", shotgunHistory);

let scriptsUtils = require("./scriptsUtils"),
    mongoDB = scriptsUtils.getMongoDbUriFromEnv(),
    mongooseConnection = scriptsUtils.connectToDb(mongoDB),
    getSaveCallBack = scriptsUtils.getSaveCallback,
    getUpdateManyCallback = scriptsUtils.getUpdateManyCallback,
    mainCallback = scriptsUtils.getMainCallback(mongooseConnection);
const { getCurrentEditionFromEditions } = require("../api/edition/editionController");
const { getRemoveCallback } = require("./scriptsUtils");

console.log("This script moves all the shotguns from the regular table to the history one");

const moveShotguns = async function () {
    console.log("\nMoving shotguns to history.");
    try {
        await Shotgun.find({}).then((shotguns) => {
            console.log("Found " + shotguns.length + " shotguns in DB.");
            const moveShotguns = async (editions) => {
                const currentEdition = getCurrentEditionFromEditions(editions);
                try {
                    const shotgunPromises = shotguns.map((shotgun) => {
                        const newshotgun = new ShotgunsHistory({
                            status: shotgun.status,
                            room: shotgun.room,
                            user: shotgun.user,
                            roommates: shotgun.roommates,
                            edition: currentEdition.id,
                        });
                        newshotgun
                            .save()
                            .then(
                                (savedItem) => {
                                    getSaveCallBack("ShotgunsHistory", "", savedItem);
                                },
                                (err) => {
                                    console.error(
                                        `Error creating shotgun history for ${currentEdition.id} because of: ${err}`
                                    );
                                    throw new Error(err);
                                }
                            )
                            .then(() => {
                                shotgun.deleteOne().then(
                                    (removedItem) => {
                                        getRemoveCallback("Shotgun", "", removedItem);
                                    },
                                    (err) => {
                                        console.error(
                                            `Error deleting shotgun ${shotgun} because of: ${err}`
                                        );
                                        throw new Error(err);
                                    }
                                );
                            });
                    });

                    await Promise.all(shotgunPromises);
                } catch {
                    (err) => callback;
                }
            };
            Edition.find({}).then((editions) => moveShotguns(editions));
        });
    } catch {
        (err) => console.error(`Error: ${err}`);
        throw new Error(err);
    }

    console.log("\nShotguns moved.");
};

const resetUsers = async function () {
    try {
        console.log("\nResetting users.");
        let users = await User.find({});
        let usernames = users.map((user) => user.username);
        let result = await User.updateMany(
            {},
            {
                hasPreShotgun: false,
                hasShotgun: false,
                room: null,
            },
            { upsert: true }
        );
        getUpdateManyCallback("\nUsers in DB: " + usernames.join(", "), result);
    } catch (error) {
        console.error(`${error}`);
        throw error;
    }
};

async.waterfall(async.reflectAll([moveShotguns, resetUsers]), mainCallback);
