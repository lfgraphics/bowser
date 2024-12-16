const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const chamberLevelSchema = new mongoose.Schema({
    levelNo: { type: Number, required: true },
    levelHeight: { type: Number, required: true },
    levelAdditionQty: { type: Number, required: true },
    levelTotalQty: { type: Number },           // Will be auto-calculated
    levelCalibrationQty: { type: Number }      // Will be auto-calculated
}, { _id: false });

const chamberSchema = new mongoose.Schema({
    chamberId: { type: String, required: true },
    levels: [chamberLevelSchema]
}, { _id: false });

const bowserSchema = new mongoose.Schema({
    regNo: String,
    odometerReading: String,
    fuelingMachineID: String,
    pumpReadingBeforeLoadingStart: String,
    pumpReadingAfterLoadingEnd: String,
    chamberSealList: [String],
    currentTrip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TripSheet'
    },
    pumpSlips: [{
        quantity: String,
        slipPhoto: String,
        bowserTankChamberID: String
    }],
    totalLoadQuantityBySlip: String,
    totalLoadQuantityByDip: String,
    chambers: [chamberSchema]
});

bowserSchema.pre('save', function (next) {
    // For each chamber
    this.chambers.forEach((chamber) => {
        // Ensure levels are in ascending order of levelNo
        chamber.levels.sort((a, b) => a.levelNo - b.levelNo);

        let previousTotalQty = 0;
        let previousHeight = 0;

        // Calculate totals and calibration
        chamber.levels.forEach((level, index) => {
            // Compute levelTotalQty
            level.levelTotalQty = previousTotalQty + level.levelAdditionQty;

            // Compute calibration
            if (index === 0) {
                // First level
                level.levelCalibrationQty = level.levelTotalQty / level.levelHeight;
            } else {
                // Subsequent levels
                const qtyDiff = level.levelTotalQty - previousTotalQty;
                const heightDiff = level.levelHeight - previousHeight;
                level.levelCalibrationQty = qtyDiff / heightDiff;
            }

            // Update trackers for next iteration
            previousTotalQty = level.levelTotalQty;
            previousHeight = level.levelHeight;
        });
    });

    next();
});

module.exports = bowsersDatabaseConnection.model('Bowser', bowserSchema, 'BowsersCollection');