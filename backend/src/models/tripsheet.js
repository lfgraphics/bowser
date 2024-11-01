const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const tripSheetSchema = new mongoose.Schema({
    tripSheetID: {
        type: String,
        required: false,
        unique: true
    },
    tripSheetGenerationDateTime: {
        type: String,
        default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    },
    bowserDriver: [
        {
            _id: mongoose.Schema.Types.ObjectId,
            handOverDate: String,
            name: String,
            mobile: String,
        }
    ],
    bowser: {
        regNo: String,
        _id: mongoose.Schema.Types.ObjectId
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
        type: String,
        required: false
    },
    proposedDepartureDateTime: { //shoud be after the generation date time
        type: String,
        required: false
    },
    loadQuantityByDip: {
    },
    loadQuantityBySlip: {
    },
    chamberWiseDipList: [
        {
            chamber1: {},
            chamber2: {},
            chamber3: {},
            chamber4: {}
        }
    ],
    chamberWiseSealList: [
        {
            chamber1: {},
            chamber2: {},
            chamber3: {},
            chamber4: {}
        }
    ],
    referenceToBowserLoadingSheetID: {
        type: String,
        required: false
    },
    settelment: {
        dateTime: String,
        odometerClosing: {
        },
        bowserNewEndReading: {
        },
        settled: {
            type: Boolean,
            default: false
        }
    }
});

module.exports = bowsersDatabaseConnection.model('TripSheet', tripSheetSchema, 'BowsersCollection');