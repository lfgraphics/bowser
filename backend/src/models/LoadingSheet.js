const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const loadingSheetSchema = new mongoose.Schema({
    regNo: { type: String, required: true }, // taken from the loading order
    odoMeter: { type: Number, required: true },
    tripSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "TripSheet" },
    fuleingMachine: { type: String, required: true },
    pumpReadingBefore: { type: Number, required: false },
    pumpReadingAfter: { type: Number, required: true },
    product: { type: String },
    chamberwiseDipListBefore: {
        type: [
            {
                chamberId: { type: String },
                levelHeight: { type: Number },
                qty: { type: Number } // auto calculated according to the bowser's chamber calibration in the .pre() hook below
            }
        ],
        _id: false
    },
    chamberwiseDipListAfter: {
        type: [
            {
                chamberId: { type: String },
                levelHeight: { type: Number },
                qty: { type: Number } // auto calculated according to the bowser's chamber calibration in the .pre() hook below
            }
        ],
        _id: false
    },
    chamberwiseSealList: {
        type: [
            {
                chamberId: { type: String },
                sealId: { type: String },
                sealPhoto: { type: String }
            }
        ],
        _id: false
    },
    loadingSlips: {
        type: [
            {
                qty: { type: Number, required: true },
                slipPhoto: { type: String, required: false },
            }
        ],
        _id: false
    },
    totalLoadQuantityBySlip: { type: Number },
    totalLoadQuantityByDip: { type: Number },
    tempLoadByDip: { type: Number },
    loadingIncharge: {
        id: { type: String, required: true },
        name: { type: String, required: true }
    },
    bccAuthorizedOfficer: {  // taken from the loading order
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoadingOrder' },
        id: { type: String, required: true },
        name: { type: String, required: true }
    },
    fulfilled: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

module.exports = bowsersDatabaseConnection.model('LoadingSheet', loadingSheetSchema, 'BowserLoadingSheets');
