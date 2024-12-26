const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');
const chamberSchema = require('./subSchemas/Chamber')
const { calculateChamberLevels } = require('../utils/calibration');

const bowserSchema = new mongoose.Schema({
    regNo: { type: String, require: true, unique: true },
    currentTrip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TripSheet'
    },
    chambers: [chamberSchema],
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

bowserSchema.pre('save', function (next) {
    try {
        this.chambers = calculateChamberLevels(this.chambers);
        next();
    } catch (error) {
        console.error('Error in Bowser pre-save hook:', error);
        next(error);
    }
});

module.exports = bowsersDatabaseConnection.model('Bowser', bowserSchema, 'BowsersCollection');
