const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');
const bowserDriverSchema = require('./subSchemas/BowserDriver');
// const dispensesSchema = require('./subSchemas/Dispenses');
const { fuelingTransactionSchema } = require('./Transaction');

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
}, { __v: false });

const Counter = bowsersDatabaseConnection.model('TripSheetCounter', counterSchema, 'CountersCollection');

const tripSheetSchema = new mongoose.Schema({
    tripSheetId: { type: Number },
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
    bowser: {
        regNo: { type: String, required: true },
        driver: [bowserDriverSchema],
    },
    hsdRate: { type: Number },
    fuelingAreaDestination: { type: String, required: false },
    proposedDepartureTime: { type: Date, required: false },
    loading: {
        sheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoadingSheet', required: true },
        quantityByDip: { type: Number, required: true },
        quantityBySlip: { type: Number, required: true },
        fullLoaded: { type: Number }
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
    dispenses: [fuelingTransactionSchema],
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
                    saleryTotal: { type: Number },
                    foodingTotal: { type: Number },
                    rewardTotal: { type: Number },
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
    closure: {
        type: {
            dateTime: { type: Date },
            details: {
                reason: { type: String },
                remarks: { type: String },
            }
        }, _id: false
    }, required: false
});

tripSheetSchema.index({ tripSheetId: 1 });
tripSheetSchema.index({ 'loading.sheetId': 1 });

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

        // Perform calculations
        const additionsQuantity = this.addition?.reduce((sum, add) => sum + (add.quantity || 0), 0) || 0;
        const dispensedQuantity = this.dispenses?.reduce((sum, dispense) => sum + (dispense.fuelQuantity || 0), 0) || 0;

        // Updated calculations
        this.loadQty = this.loading?.quantityByDip || 0;
        this.totalAdditionQty = additionsQuantity;
        this.totalLoadQuantityBySlip = this.loading?.quantityBySlip || 0;
        this.totalLoadQuantity = this.loadQty + additionsQuantity;
        this.saleQty = dispensedQuantity;
        this.balanceQty = this.totalLoadQuantity - this.saleQty;
        this.balanceQtyBySlip = this.totalLoadQuantityBySlip - this.saleQty;

        // check for each dispense if all has been posted (posted?.status == true) then make this.posted = true
        const allDispensesPosted = this.dispenses?.every(dispense => dispense.posted?.status === true);
        this.posted = allDispensesPosted;
        
        next();
    } catch (err) {
        console.error('Error in pre-save hook for TripSheet:', err);
        next(err);
    }
});

const TripSheet = bowsersDatabaseConnection.model('TripSheet', tripSheetSchema, 'TripSheetsCollection');

module.exports = { TripSheet, Counter };