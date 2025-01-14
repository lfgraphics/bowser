const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');
const bowserDriverSchema = require('./subSchemas/BowserDriver');
const dispensesSchema = require('./subSchemas/Dispenses');

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
}, { __v: false });

const Counter = bowsersDatabaseConnection.model('TripSheetCounter', counterSchema, 'CountersCollection');

const tripSheetSchema = new mongoose.Schema({
    tripSheetId: { type: Number, unique: true },
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
    bowser: {
        regNo: { type: String, required: true },
        driver: [bowserDriverSchema],
    },
    fuelingAreaDestination: { type: String, required: false },
    proposedDepartureTime: { type: Date, required: false },
    loading: {
        sheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoadingSheet', required: true },
        quantityByDip: { type: Number, required: true },
        quantityBySlip: { type: Number, required: true },
    },
    addition: {
        type: [
            {
                at: { type: Date },
                by: {
                    id: { type: String },
                    name: { type: String }
                },
                quantity: { type: Number },
            }
        ],
        _id: false,
    },
    loadQty: { type: Number },
    totalLoadQuantityBySlip: { type: Number },
    totalAdditionQty: { type: Number },
    totalLoadQuantity: { type: Number },
    dispenses: [dispensesSchema],
    saleQty: { type: Number },
    balanceQty: { type: Number },
    balanceQtyBySlip: { type: Number },
    settelment: {
        type: {
            dateTime: { type: Date },
            details: {
                odometer: { type: Number },
                pumpReading: { type: Number },
                chamberwiseDipList: {
                    type: [
                        { chamberId: String, levelHeight: Number, qty: Number }
                    ],
                    _id: false,
                },
                totalQty: { type: Number },
                by: {
                    id: { type: String },
                    name: { type: String }
                },
                extras: {
                    filledByDriver: { type: Number },
                    saleryDays: { type: Number },
                    foodingDays: { type: Number },
                    rewardTrips: { type: Number },
                    hsdRateFor: { type: Number },
                    tollTax: { type: Number },
                    borderOtherExp: { type: Number },
                    unload: { type: Number },
                    hsdPerKm: { type: Number },
                }
            },
            settled: { type: Boolean, default: false },
        }, _id: false
    },
    posted: { type: Boolean, default: false },
});

tripSheetSchema.index({ tripSheetId: 1 });
tripSheetSchema.index({ 'loading.sheetId': 1 });

module.exports = bowsersDatabaseConnection.model('TripSheet', tripSheetSchema, 'TripSheetsCollection');