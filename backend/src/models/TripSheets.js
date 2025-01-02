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
    tripSheetId: { type: Number, unique: true }, // Auto-increment field
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
                sheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoadingSheet' },
                quantityByDip: { type: Number, required: true },
                quantityBySlip: { type: Number, required: true },
            }
        ],
        _id: false,
    },
    dispenses: [dispensesSchema],
    totalLoadQuantity: { type: Number },
    saleQty: { type: Number },
    balanceQty: { type: Number },
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
                }
            },
            settled: { type: Boolean, default: false },
        }, _id: false
    },
    posted: { type: Boolean, default: false },
});

tripSheetSchema.index({ tripSheetId: 1 });
tripSheetSchema.index({ 'loading.sheetId': 1 });

// Pre-save hook for auto-increment and calculations
tripSheetSchema.pre('save', async function (next) {
    try {
        if (this.isNew) {
            const counter = await Counter.findOneAndUpdate(
                { _id: 'tripSheetId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.tripSheetId = counter.seq;
        }

        const additionsQuantity = this.addition?.reduce((sum, add) => sum + (add.quantityByDip || 0), 0) || 0;
        this.totalLoadQuantity = (this.loading?.quantityByDip || 0) + additionsQuantity;

        const dispensedQuantity = this.dispenses?.reduce((sum, dispense) => sum + (dispense.fuelQuantity || 0), 0) || 0;
        this.saleQty = dispensedQuantity;
        this.balanceQty = this.totalLoadQuantity - this.saleQty;

        next();
    } catch (err) {
        console.error('Error in pre-save hook for TripSheet:', err);
        next(err);
    }
});

module.exports = bowsersDatabaseConnection.model('TripSheet', tripSheetSchema, 'TripSheetsCollection');