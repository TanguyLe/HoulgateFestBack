let mongoose = require("mongoose");

const MONGO_STATUSES = ["disconnected", "connected", "connecting", "disconnecting"];

const getStatusInfo = () => ({
    backServer: "up",
    mongoDB: MONGO_STATUSES[mongoose.connection.readyState],
});

module.exports = (app) => {
    app.route("/").get((req, res) => res.status(200).send(getStatusInfo()));
    app.route("/status").get((req, res) => res.status(200).send(getStatusInfo()));
};
