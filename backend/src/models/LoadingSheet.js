const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');
const { calculateQty } = require('../utils/calibration');
const Bowser = require('./Bowsers');
const LoadingOrder = require('./LoadingOrder')

const loadingSheetSchema = new mongoose.Schema({
    regNo: { type: String, required: true }, // taken from the loading order
    odoMeter: { type: Number, required: true },
    fuleingMachine: { type: String, required: true },
    pumpReadingBefore: { type: Number, required: false },
    pumpReadingAfter: { type: Number, required: true },
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
        _id: false // Correctly prevents automatic _id creation for subdocuments
    },
    pumpSlips: {
        type: [
            {
                chamberId: { type: String, required: true },
                qty: { type: Number, required: true },
                slipPhoto: { type: String, required: true },
            }
        ],
        _id: false // Correctly prevents automatic _id creation for subdocuments
    },
    totalLoadQuantityBySlip: { type: Number }, // auto calculated in .pre() hook: pumpslips.reduce(slip)=>slip.Number(qty)
    totalLoadQuantityByDip: { type: Number }, // auto calculated in .pre() hook: according to the bowsers's done calibration of the bowser chambers. refrence is "chamberwiseDipListAfter"
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

loadingSheetSchema.pre('save', async function (next) {
    try {
        // Fetch the Bowser document for the provided regNo
        const bowser = await Bowser.findOne({ regNo: this.regNo });
        if (!bowser) {
            return next(new Error('Bowser not found for the provided regNo'));
        }

        const bowserChambers = bowser.chambers;

        // Calculate qty for chamberwiseDipListBefore
        for (const dip of this.chamberwiseDipListBefore) {
            if (dip.qty == null || dip.qty === undefined || dip.qty === 0) {
                dip.qty = calculateQty(bowserChambers, dip.chamberId, dip.levelHeight);
            }
        }

        // Calculate qty for chamberwiseDipListAfter
        for (const dip of this.chamberwiseDipListAfter) {
            if (dip.qty == null || dip.qty === undefined || dip.qty === 0) {
                dip.qty = calculateQty(bowserChambers, dip.chamberId, dip.levelHeight);
            }
        }

        // Calculate totalLoadQuantityBySlip
        this.totalLoadQuantityBySlip = this.pumpSlips.reduce((total, slip) => {
            return total + parseFloat(slip.qty);
        }, 0);

        // Calculate totalLoadQuantityByDip based on chamberwiseDipListAfter
        this.totalLoadQuantityByDip = this.chamberwiseDipListAfter.reduce((total, dip) => {
            return total + parseFloat(dip.qty);
        }, 0);

        let loadingOrder = await LoadingOrder.findByIdAndUpdate(
            new mongoose.Types.ObjectId(String(this.bccAuthorizedOfficer.orderId)), // Find the order by its _id
            { $set: { fulfilled: true } },              // Set the fulfilled field to true
            { new: true }                               // Return the updated document
        );

        if (!loadingOrder) {
            console.error('Loading order not found');
            return;
        }

        console.log('Updated Loading Order:', loadingOrder);

        next();
    } catch (error) {
        next(error);
    }
});

module.exports = bowsersDatabaseConnection.model('LoadingSheet', loadingSheetSchema, 'BowserLoadingSheets');
