const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const tripSheetSchema = new mongoose.Schema({
    bowserTripSheetID: String,
    tripSheetGenerationDateTime: { type: Date, default: Date.now, timezone: 'IST' },
    bowserDriver: {
        userId: String,
        name: String,
        mobileNumber: String
    },
    bowserOdometerStartReading: Number,
    fuelingAreaDestination: String,
    bowserPumpEndReading: String,
    proposedDepartureDateTime: Date,
    loadQuantityByDipAndSlip: String,
    chamberWiseDipList: [String],
    chamberWiseSealList: [String],
    referenceToBowserLoadingSheetID: String,
});

module.exports = bowsersDatabaseConnection.model('TripSheet', tripSheetSchema, 'TripSheetsCollection');