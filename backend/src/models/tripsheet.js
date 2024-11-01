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
        default: () => {
            const date = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
            return date.toLocaleDateString('en-IN', options);
        }
    },
    bowserDriver: [
        {
            handOverDate: String,
            name: String,
            id: String,
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
        validate: {
            validator: function (v) {
                const generationDateTime = new Date(this.tripSheetGenerationDateTime);
                const proposedDateTime = new Date(v);
                return proposedDateTime > generationDateTime;
            },
            message: 'Proposed departure date time should be after the generation date time'
        }
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