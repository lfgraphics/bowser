const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const tripSheetSchema = new mongoose.Schema({
    BowserTripSheetID: {
        type: String,
        required: false,
        unique: true
    },
    TripSheetGenerationDateTime: {
        type: Date,
        default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    },
    BowserDriver: {
        ID: {
            type: String,
            required: true
        },
        Name: {
            type: String,
            required: true
        },
        MobileNumber: {
            type: String,
            required: true
        }
    },
    BowserOdometerStartReading: {
        type: Number,
        required: false
    },
    FuelingAreaDestination: {
        type: String,
        required: false
    },
    BowserPumpEndReading: {
        type: Number,
        required: false
    },
    ProposedDepartureDateTime: {
        type: Date,
        required: false
    },
    LoadQuantityByDipAndSlip: {
        type: Number,
        required: false
    },
    ChamberWiseDipList: {
        type: [Number],
        required: false
    },
    ChamberWiseSealList: {
        type: [String],
        required: false
    },
    ReferenceToBowserLoadingSheetID: {
        type: String,
        required: false
    }
});

module.exports = bowsersDatabaseConnection.model('tripSheet', tripSheetSchema, 'BowsersCollection');