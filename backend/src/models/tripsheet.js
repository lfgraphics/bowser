const mongoose = require('mongoose');
const moment = require("moment-timezone");
const { bowsersDatabaseConnection } = require('../../config/database');

const tripSheetSchema = new mongoose.Schema({
    tripSheetId: { type: Number, required: true, unique: true },
    tripSheetGenerationDateTime: { type: Date, default: () => moment().tz("Asia/Kolkata").toDate() },
    bowserDriver: [
        {
            handOverDate: String,
            name: String,
            _id: false,
            phoneNo: String,
        }
    ],
    bowser: {
        regNo: String,
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
    proposedDepartureDateTime: {
        type: String,
        required: false,
        // validate: {
        //     validator: function (v) {
        //         const generationDateTime = new Date(this.tripSheetGenerationDateTime);
        //         const proposedDateTime = new Date(v);
        //         return proposedDateTime > generationDateTime;
        //     },
        //     message: 'Proposed departure date time should be after the generation date time'
        // }
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
}, { versionKey: false });

// Disable automatic _id generation for bowserDriver
tripSheetSchema.path('bowserDriver').schema.add({ _id: false });

module.exports = bowsersDatabaseConnection.model('TripSheet', tripSheetSchema, 'TripSheetsCollection');