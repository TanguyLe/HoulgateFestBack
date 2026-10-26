// Shotguns of past editions, moved there by the historisation

let mongoose = require("mongoose");

let shotgunHistorySchema = new mongoose.Schema(
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
            ref: "Edition",
            required: true,
        },
    },
    {
        timestamps: true,
        collection: "shotgunsHistory",
    }
);

module.exports = mongoose.model("ShotgunsHistory", shotgunHistorySchema);
