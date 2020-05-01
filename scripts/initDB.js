#! /usr/bin/env node

let async = require("async");

let Room = require("../api/room/roomModel"),
    Edition = require("../api/edition/editionModel");

let editions = require("./data/editionsDef.js"),
    villaLesGenets = require("./data/villaLesGenetsDef.js");

let scriptsUtils = require("./scriptsUtils"),
    mongoDB = scriptsUtils.getMongoDbFromArgs(),
    mongooseConnection = scriptsUtils.connectToDb(mongoDB),
    getSaveCallBack = scriptsUtils.getSaveCallback,
    mainCallback = scriptsUtils.getMainCallback(mongooseConnection);

console.log("This script populates initial necessary objects to the database (rooms & editions)." +
            " It will fail if the DB is already filled or not accessible. \n");

let createRooms = (callback) => {
    let stackCreateRooms = [];

    // For each floor and each room inside it we prepare a function to create it
    villaLesGenets.villaLesGenets.floors.forEach(
        (floor) => {
            floor.rooms.forEach((room) =>
                stackCreateRooms.push(
                    (cb) => new Room({type: room.type, text: room.name, nbBeds: room.seats}).save(getSaveCallBack(cb))
                )
            )
        }
    );
    // And then they're executed in parallel
    async.parallel(stackCreateRooms, callback);
};

let createEditions = (callback) => {
    async.parallel(
        editions.editions.map(editionDef =>
            (cb) => new Edition({
                year: editionDef.year,
                weekendDate: editionDef.weekendDate,
                shotgunDate: editionDef.shotgunDate
            }).save(getSaveCallBack(cb)))
        , callback);
};


async.parallel([createRooms, createEditions], mainCallback);
