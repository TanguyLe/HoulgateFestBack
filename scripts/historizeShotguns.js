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
    mainCallback = scriptsUtils.getMainCallback(mongooseConnection);
const { getCurrentEditionFromEditions } = require("../api/edition/editionController");
const { getRemoveCallback } = require("./scriptsUtils");

console.log("This script moves all the shotguns from the regular table to the history one");

const moveShotguns = (callback) => {
    console.log("\nMoving shotguns to history.");

    async.waterfall(
        [
            (cb) => Shotgun.find({}, cb),
            (shotguns, cb) => {
                const moveShotguns = (editions, cb) => {
                    const currentEdition = getCurrentEditionFromEditions(editions);

                    async.parallel(
                        async.reflectAll(
                            shotguns.map((shotgun) => (cb) => {
                                async.series(
                                    [
                                        (cb) => {
                                            const newshotgun = new ShotgunsHistory({
                                                status: shotgun.status,
                                                room: shotgun.room,
                                                user: shotgun.user,
                                                roommates: shotgun.roommates,
                                                edition: currentEdition.id,
                                            });
                                            newshotgun.save().then(
                                                (savedItem) => {
                                                    getSaveCallBack(
                                                        "ShotgunsHistory",
                                                        "",
                                                        savedItem
                                                    );
                                                },
                                                (err) => {
                                                    console.error(
                                                        `Error creating shotgun ${currentEdition.id} because of: ${err}`
                                                    );
                                                    throw new Error(err);
                                                }
                                            );
                                        },
                                        (cb) =>
                                            shotgun.remove(
                                                getRemoveCallback("Shotgun", "", shotgun)
                                            ),
                                    ],
                                    cb
                                );
                            })
                        ),
                        cb
                    );
                };
                async.waterfall([(cb) => Edition.find({}, cb), moveShotguns], cb);
            },
        ],
        callback
    );

    console.log("\nShotguns moved.");
};

const resetUsers = (_, callback) => {
    User.updateMany(
        {},
        {
            hasPreShotgun: false,
            hasShotgun: false,
            room: null,
        },
        { upsert: true },
        getSaveCallBack("User", callback)
    );
};

async.waterfall(async.reflectAll([moveShotguns, resetUsers]), mainCallback);
