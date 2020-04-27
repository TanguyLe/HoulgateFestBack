let mongoose = require("mongoose");


module.exports = {
    getMongoDbFromArgs: () => {
        console.log("Specifies database as argument - e.g.: populatedb mongodb://your_username:your_password@your_dabase_url");

        // Get arguments passed on command line
        let userArgs = process.argv.slice(2);
        if (!userArgs[0].startsWith("mongodb://"))
            throw "ERROR: You need to specify a valid mongodb URL as the first argument";

        return userArgs[0];
    },
    connectToDb: (mongoDB) => {
        mongoose.Promise = global.Promise;
        mongoose.set('useCreateIndex', true);
        mongoose.connection.on("error", console.error.bind(console, "MongoDB connection error:"));
        mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

        return mongoose.connection
    },
    testUsers: [
        ["Patrick", "Rothfuss@rothfuss.je", "test", true],
        ["Ben", "Bova@bova.je", "test", true],
        ["Isaac", "Asimov@asimov.je", "test", true],
        ["Bob", "bob@bob.je", "test", true],
        ["Jim", "Jones@jones.je", "test", true],
        ["Julie", "julie@julie.je", "test", true],
        ["Marie", "marie@marie.je", "test", true],
        ["Claire", "claire@claire.je", "test", true]
    ],
    testTrips: [
        [new Date(), "Paris 18", 3, "BACK"],
        [Date.parse('01 Jan 1970 00:45:00 GMT'), "Paris 18", 4, "BACK"],
        [Date.parse('28 Jan 1979 15:30:00 GMT'), "Montélimart", 1, "FORTH"],
        [Date.parse('05 Jan 1970 00:00:00 GMT'), "Châlons-sur-Saone", 6, "BACK"],
    ]
};
