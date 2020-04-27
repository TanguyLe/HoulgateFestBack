// Trip model

let mongoose = require('mongoose');

let Schema = mongoose.Schema;

let TripSchema = new Schema(
    {
        date: {type: Date, required: true},
        location: {type: String, required: true},
        seats: {type: Number, min: [1, 'No places'], required: true},
        driver: {type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true},
        passengers: [{type: mongoose.Schema.Types.ObjectId, ref: 'Users'}],
        type: {type: String, enum : ['BACK', 'FORTH'], required: true}
    }
);

module.exports = mongoose.model('Trips', TripSchema);
