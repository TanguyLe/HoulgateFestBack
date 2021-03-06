// Trip model

let mongoose = require("mongoose");

let Schema = mongoose.Schema;

let TripSchema = new Schema({
    date: { type: mongoose.Schema.Types.Date, required: true },
    location: { type: mongoose.Schema.Types.String, required: true },
    seats: {
        type: mongoose.Schema.Types.Number,
        min: [1, "No places"],
        required: true,
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
    },
    passengers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
});
TripSchema.index({ date: 1, driver: 1 }, { unique: true });

module.exports = mongoose.model("Trips", TripSchema);
