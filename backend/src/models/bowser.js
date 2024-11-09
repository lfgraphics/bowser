const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const bowserSchema = new mongoose.Schema({
    regNo: String,
    odometerReading: String,
    fuelingMachineID: String,
    pumpReadingBeforeLoadingStart: String,
    pumpReadingAfterLoadingEnd: String,
    chamberDipListBeforeLoadingStart: [String],
    chamberDipListAfterLoadingEnd: [String],
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
});

module.exports = bowsersDatabaseConnection.model('Bowser', bowserSchema, 'BowsersCollection');