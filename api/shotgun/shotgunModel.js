// Shotgun model

let mongoose = require("mongoose");

let shotgunSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["preShotgunned", "shotgunned"],
            required: true,
            default: "preShotgunned",
        },
        // One shotgun per room and per owner, enforced by the DB so concurrent requests can't
        // both pass the "room free" / "user hasn't shotgun" checks (past editions are in shotgunsHistory)
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Rooms",
            required: true,
            unique: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
            unique: true,
        },
        roommates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model("Shotguns", shotgunSchema);
