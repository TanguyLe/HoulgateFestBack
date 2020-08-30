let mongoose = require("mongoose");

const isFunction = (functionToCheck) => {
    return functionToCheck && {}.toString.call(functionToCheck) === "[object Function]";
};

const getSaveMessage = (schemaName, objStr) => `New ${schemaName} in the db: ${objStr}.`;
const getDeleteMessage = (schemaName, objStr) => `${schemaName} removed from the db: ${objStr}.`;

const getSingleOperationCallback = (label, callback, objectSerialize, messageFct) => (
    err,
    object
) => {
    if (err) {
        console.log(err.errmsg);
        callback(err, null);
        return;
    }

    let objStr;
    if (objectSerialize)
        if (isFunction(objectSerialize)) objStr = objectSerialize(object);
        else objStr = object[objectSerialize];
    else objStr = object.toString().replace(/\n/g, "");

    console.log(messageFct(label, objStr));
    callback(null);
};

module.exports = {
    getMongoDbUriFromEnv: () => {
       if (process.env.MONGO_CONNECTION === undefined)
           throw "ERROR: MONGO_CONNECTION env variable needs to be set.";

       const connectionURI = process.env.MONGO_CONNECTION;

        if (!connectionURI.startsWith("mongodb://") && !connectionURI.startsWith("mongodb+srv://"))
            throw "ERROR: You need to specify a valid mongodb URL in MONGO_CONNECTION.";

       return connectionURI;
    },
    connectToDb: (mongoDBUri) => {
        mongoose.Promise = global.Promise;
        mongoose.set("useCreateIndex", true);
        mongoose.connection.on("error", console.error.bind(console, "MongoDB connection error:"));
        mongoose.connect(mongoDBUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        return mongoose.connection;
    },
    getSaveCallback: (label, callback, objectSerialize) =>
        getSingleOperationCallback(label, callback, objectSerialize, getSaveMessage),
    getRemoveCallback: (label, callback, objectSerialize) =>
        getSingleOperationCallback(label, callback, objectSerialize, getDeleteMessage),
    getDeleteManyCallback: (label, callback) => (err, result) => {
        if (err) {
            console.log(err.errmsg);
            callback(err, null);
            return;
        }
        console.log(`${label} have been deleted if present, ${result.n} actual deletions.`);
        callback(null);
    },
    getMainCallback: (mongooseConnection) => (err) => {
        if (err) {
            console.log("\nDB Operation failed due to an error: " + err);
        } else console.log("\nDB Operation finished successfully, closing the connection.");
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
        ["Claire", "claire", "test", true],
    ],
    testTrips: [
        [Date.parse("09 Jun 2020 15:45:00 GMT"), "Paris 18", 3, "BACK"],
        [Date.parse("01 Jan 1970 00:45:00 GMT"), "Paris 18", 4, "BACK"],
        [Date.parse("28 Jan 1979 15:30:00 GMT"), "Montélimart", 1, "FORTH"],
        [Date.parse("05 Jan 1970 00:00:00 GMT"), "Châlons-sur-Saone", 6, "BACK"],
    ],
};
