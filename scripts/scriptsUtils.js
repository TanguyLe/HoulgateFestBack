let mongoose = require("mongoose");


const isFunction = (functionToCheck) => {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
};

const getSaveMessage = (schemaName, objStr) => `New ${schemaName} in the db: ${objStr}.`;
const getDeleteMessage = (schemaName, objStr) => `${schemaName} removed from the db: ${objStr}.`;

const getSingleOperationCallback = (label, callback, objectSerialize, messageFct) =>
    (err, object) => {
        if (err) {
            callback(err, null);
            return
        }

        let objStr;
        if (objectSerialize)
            if (isFunction(objectSerialize))
                objStr = objectSerialize(object);
            else
                objStr = object[objectSerialize];
        else
            objStr = object.toString().replace(/\n/g, "");

        console.log(messageFct(label, objStr));
        callback(null);
    };

module.exports = {
    getMongoDbFromEnvOrArgs: () => {
        if ((process.env.NODE_ENV) === "production") {
            if (process.env.MONGO_CONNECTION === undefined)
                throw "ERROR: In a prod environment (NODE_ENV=production) you need to set MONGO_CONNECTION";

            return process.env.MONGO_CONNECTION
        }
        // Get arguments passed on command line
        let userArgs = process.argv.slice(2);

        if (!userArgs[0].startsWith("mongodb://") && !userArgs[0].startsWith("mongodb+srv://"))
            throw "ERROR: You need to specify a valid mongodb URL as the first argument";
        // mongodb://your_username:your_password@your_dabase_url

        return userArgs[0];
    },
    connectToDb: (mongoDB) => {
        mongoose.Promise = global.Promise;
        mongoose.set('useCreateIndex', true);
        mongoose.connection.on("error", console.error.bind(console, "MongoDB connection error:"));
        mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

        return mongoose.connection
    },
    getSaveCallback: (label, callback, objectSerialize) =>
        getSingleOperationCallback(label, callback, objectSerialize, getSaveMessage),
    getRemoveCallback: (label, callback, objectSerialize) =>
        getSingleOperationCallback(label, callback, objectSerialize, getDeleteMessage),
    getDeleteManyCallback: (label, callback) =>
        (err, result) => {
            if (err) {
                callback(err, null);
                return
            }
            console.log(`${label} have been deleted if present, ${result.n} actual deletions.`);
            callback(null);
        },
    getMainCallback: (mongooseConnection) =>
        (err) => {
            if (err) {
                console.log("\nDB Operation failed due to an error: " + err);
            } else
                console.log("\nDB Operation finished successfully, closing the connection.");
            // All done, disconnect from database
            mongooseConnection.close();
        },
    testUsers: [
        ["Patrick", "patrick", "test", true],
        ["Ben", "ben", "test", true],
        ["Isaac", "isaac", "test", true],
        ["Bob", "bob", "test", true],
        ["Jim", "jim", "test", true],
        ["Julie", "julie", "test", true],
        ["Marie", "marie", "test", true],
        ["Claire", "claire", "test", true]
    ],
    testTrips: [
        [new Date(), "Paris 18", 3, "BACK"],
        [Date.parse('01 Jan 1970 00:45:00 GMT'), "Paris 18", 4, "BACK"],
        [Date.parse('28 Jan 1979 15:30:00 GMT'), "Montélimart", 1, "FORTH"],
        [Date.parse('05 Jan 1970 00:00:00 GMT'), "Châlons-sur-Saone", 6, "BACK"],
    ]
};
