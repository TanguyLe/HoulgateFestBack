#! /usr/bin/env node

let _0 = require("../api/user/userModel"),
    _1 = require("../api/room/roomModel"),
    _2 = require("../api/shotgun/shotgunModel"),
    Edition = require("../api/edition/editionModel"),
    { historizeShotguns } = require("../api/shotgun/shotgunController/historizeController");

let scriptsUtils = require("./scriptsUtils"),
    mongoDB = scriptsUtils.getMongoDbUriFromEnv(),
    mongooseConnection = scriptsUtils.connectToDb(mongoDB);

const year = Number(process.argv[2] || new Date().getFullYear());

console.log(
    "This script moves all the shotguns to the history of an edition and frees the rooms and users: " +
        "npm run historizeShotguns -- [year] (default: the current year)." +
        " The admin interface does the same.\n",
);

const run = async () => {
    const edition = await Edition.findOne({ year: year });
    if (!edition) throw new Error("No edition for " + year);

    const result = await historizeShotguns(edition);
    console.log(
        `${result.historized} shotguns historized for ${year}, ` +
            `${result.droppedPreShotguns} pre-shotguns dropped, ${result.usersReset} users reset.`,
    );
};

run()
    .catch((err) => {
        console.error(err.message);
        process.exitCode = 1;
    })
    .finally(() => scriptsUtils.closeDb(mongooseConnection));
