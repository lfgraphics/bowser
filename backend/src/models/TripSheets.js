const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');
const bowserDriverSchema = require('./subSchemas/BowserDriver');
const dispensesSchema = require('./subSchemas/Dispenses');
const { calculateQty } = require('../utils/calibration');
const Bowser = require('./Bowsers');

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
        odometerStartReading: { type: Number, required: false },
        driver: [bowserDriverSchema],
        pumpEndReading: { type: Number, required: true },
        chamberwiseDipList: {
            type: [
                { chamberId: String, levelHeight: Number, qty: Number }
            ],
            _id: false,
        },
        chamberwiseSealList: {
            type: [
                { chamberId: String, sealId: String }
            ],
            _id: false,
        },
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
                quantity: { type: Number },
                slips: [{ qty: Number, photo: String }],
                quantityBySlip: { type: Number },
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
        // Auto-increment tripSheetId
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
        this.totalLoadQuantity = this.loading?.quantityByDip + additionsQuantity;
        const dispensedQuantity = this.dispenses?.reduce((sum, dispense) => sum + (dispense.fuelQuantity || 0), 0) || 0;
        this.saleQty = dispensedQuantity;  // "Sale" is how much was dispensed
        this.balanceQty = this.totalLoadQuantity - this.saleQty;
        // // Handle settlement logic
        // if (this.settelment?.settled) {
        //     const bowserChambers = await Bowser.findOne({ regNo: this.bowser.regNo });
        //     for (const dip of this.settelment.details.chamberwiseDipList) {
        //         if (dip.qty == null || dip.qty === undefined) {
        //             dip.qty = calculateQty(bowserChambers, dip.chamberId, dip.levelHeight);
        //         }
        //     }
        // }

        next();
    } catch (err) {
        console.error('Error in pre-save hook for TripSheet:', err);
        next(err);
    }
});

// Pre-update hook for recalculations
tripSheetSchema.pre('updateOne', async function (next) {
    try {
        const update = this.getUpdate();
        // Only recalc if the doc might have changed in ways that affect these quantities
        if (update.$set || update.$push || update.$pull) {
            // Fetch the existing TripSheet document
            const tripSheet = await this.model.findOne(this.getQuery());
            if (!tripSheet) {
                return next(new Error('TripSheet not found'));
            }

            // 1. If there's any addition changes, recalc totalLoadQuantity, saleQty, balanceQty
            const additionsQuantity = this.addition?.reduce((sum, add) => sum + (add.quantity || 0), 0) || 0;
            this.totalLoadQuantity = this.loading?.quantityByDip + additionsQuantity;
            const dispensedQuantity = this.dispenses?.reduce((sum, dispense) => sum + (dispense.fuelQuantity || 0), 0) || 0;
            this.saleQty = dispensedQuantity;  // "Sale" is how much was dispensed
            this.balanceQty = this.totalLoadQuantity - this.saleQty;

            await tripSheet.save();
        }

        next();
    } catch (error) {
        console.error("Error in tripSheetSchema pre updateOne hook:", error);
        next(error);
    }
});

module.exports = bowsersDatabaseConnection.model('TripSheet', tripSheetSchema, 'TripSheetsCollection');