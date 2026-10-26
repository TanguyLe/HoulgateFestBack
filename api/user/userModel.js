let mongoose = require("mongoose");

let UserSchema = new mongoose.Schema({
    email: {
        type: String,
        lowercase: true,
        required: true,
        unique: true,
    },
    username: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    hasShotgun: { type: Boolean, default: false },
    hasPreShotgun: { type: Boolean, default: false },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Rooms", default: null },
    activated: {
        type: Boolean,
        required: true,
        default: false,
    },
    // Set by hand in the DB or by another admin, never on sign up
    isAdmin: { type: Boolean, default: false },
});

module.exports = mongoose.model("Users", UserSchema);
