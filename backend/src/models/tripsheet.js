const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const tripSheetSchema = new mongoose.Schema({
    tripSheetID: String,
    bowserDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    bowser:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Bowser'
    },
    bowserOdometerStartReading: Number,
    fuelingAreaDestination: String,
    bowserPumpEndReading: String,
    proposedDepartureDateTime: Date,
    loadQuantityByDipAndSlip: String,
    chamberWiseDipList: [String],
    chamberWiseSealList: [String],
    referenceToBowserLoadingSheetID: String,
    generationDateTime: { type: Date, default: Date.now, timezone: 'IST' },
});

module.exports = bowsersDatabaseConnection.model('TripSheet', tripSheetSchema, 'TripSheetsCollection');