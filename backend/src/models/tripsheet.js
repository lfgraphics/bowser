const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const tripSheetSchema = new mongoose.Schema({
    bowserTripSheetID: {
        type: String,
        required: false,
        unique: true
    },
    tripSheetGenerationDateTime: {
        type: Date,
        default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    },
    bowserDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    bowser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BowsersCollection',
        required: false
    },
    bowserOdometerStartReading: {
        type: Number,
        required: false
    },
    fuelingAreaDestination: {
        type: String,
        required: false
    },
    bowserPumpEndReading: {
        type: Number,
        required: false
    },
    proposedDepartureDateTime: {
        type: Date,
        required: false
    },
    loadQuantityByDipAndSlip: {
        type: Number,
        required: false
    },
    chamberWiseDipList: {
        type: [Number],
        required: false
    },
    chamberWiseSealList: {
        type: [String],
        required: false
    },
    referenceToBowserLoadingSheetID: {
        type: String,
        required: false
    }
});

module.exports = bowsersDatabaseConnection.model('TripSheet', tripSheetSchema, 'BowsersCollection');