#! /usr/bin/env node

let async = require("async");

let Room = require("../api/room/roomModel"),
    Edition = require("../api/edition/editionModel");

let editions = require("./data/editionsDef.js"),
    villaLesGenets = require("./data/villaLesGenetsDef.js");

let scriptsUtils = require("./scriptsUtils"),
    mongoDB = scriptsUtils.getMongoDbUriFromEnv(),
    mongooseConnection = scriptsUtils.connectToDb(mongoDB),
    getSaveCallBack = scriptsUtils.getSaveCallback,
    mainCallback = scriptsUtils.getMainCallback(mongooseConnection);

console.log(
    "This script populates initial necessary objects to the database (rooms & editions)." +
        " It will fail if the DB is not accessible and log if a record is already present. \n"
);

let createRooms = (callback) => {
    let stackCreateRooms = [];

    // For each floor and each room inside it we prepare a function to create it
    villaLesGenets.villaLesGenets.floors.forEach((floor) => {
        floor.rooms.forEach((room) =>
            stackCreateRooms.push((cb) =>
                new Room({
                    type: room.type,
                    text: room.name,
                    nbBeds: room.seats,
                }).save(getSaveCallBack("Room", cb, "text"))
            )
        );
    });
    // And then they're executed in parallel
    async.parallel(async.reflectAll(stackCreateRooms), callback);
};

let createEditions = (callback) => {
    async.parallel(
        async.reflectAll(
            editions.editions.map((editionDef) => (cb) =>
                new Edition({
                    year: editionDef.year,
                    weekendDate: editionDef.weekendDate,
                    shotgunDate: editionDef.shotgunDate,
                }).save(getSaveCallBack("Edition", cb, "year"))
            )
        ),
        callback
    );
};

async.parallel(async.reflectAll([createRooms, createEditions]), mainCallback);
