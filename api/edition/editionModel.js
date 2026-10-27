// Editions model

let mongoose = require("mongoose");

let EditionSchema = new mongoose.Schema({
    year: {
        type: mongoose.Schema.Types.Number,
        required: true,
        unique: true,
    },
    weekendDate: { type: mongoose.Schema.Types.Date, required: true },
    shotgunDate: { type: mongoose.Schema.Types.Date, required: true },
    // Embedded in an iframe by the scores page of the front, so only https pages are accepted
    scoresBoardUrl: {
        type: mongoose.Schema.Types.String,
        trim: true,
        validate: {
            validator: (url) => !url || /^https:\/\/[^\s]+$/.test(url),
            message: "The scores board URL must be an https URL",
        },
    },
});

module.exports = mongoose.model("Edition", EditionSchema);
