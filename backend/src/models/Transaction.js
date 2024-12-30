const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');
const TripSheet = require('./TripSheets');

const fuelingTransactionSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, required: false },
    category: {
        type: String, require: false,
        validate: {
            validator: function (v) {
                return v === 'Own' || v === 'Attatch' || v === 'Bulk Sale';
            },
            message: 'Fueling category must be either Bulk Sale or Attatch or Own'
        }
    },
    party: { type: String, require: true, default: "Own" },
    odometer: { type: Number },
    tripSheetId: { type: Number },
    vehicleNumberPlateImage: { type: String, required: false },
    vehicleNumber: { type: String, required: false },
    driverId: { type: String, required: false },
    driverName: { type: String, required: false },
    driverMobile: { type: String, required: false },
    fuelMeterImage: { type: [String], _id: false, required: true },
    // slipImage: { type: String, required: false },
    quantityType: {
        type: String,
        required: false,
        validate: {
            validator: function (v) {
                return v === 'Full' || v === 'Part';
            },
            message: 'Quantity type must be either Full or Part'
        }
    },
    fuelQuantity: { type: Number, required: false },
    gpsLocation: {
        type: String, required: false,
        validate: {
            validator: function (value) {
                return value.trim().length > 0;
            },
            message: "Gps location can't be blank"
        }
    },
    fuelingDateTime: { type: Date, required: false },
    bowser: {
        regNo: { type: String, require: false },
        driver: {
            name: { type: String, required: false },
            // id: { type: String, required: false },
            phoneNo: { type: String, required: false }
        },
    },
    verified: {
        status: { type: Boolean },
        by: {
            id: String,
            name: String
        }
    },
    posted: {
        status: { type: Boolean },
        by: {
            id: String,
            name: String
        }
    },
    allocationAdmin: {
        name: { type: String, required: false },
        id: { type: String, required: false },
        allocationTime: { type: String, require: false }
    }
});

fuelingTransactionSchema.post('save', async function (doc) {
    try {
        const tripSheet = await TripSheet.findOne({ tripSheetId: doc.tripSheetId });

        if (tripSheet) {
            const dispenseIndex = tripSheet.dispenses?.findIndex(
                (d) => d.transaction?.toString() === doc._id?.toString()
            );

            if (dispenseIndex > -1) {
                tripSheet.dispenses[dispenseIndex].fuelQuantity = doc.fuelQuantity;
                tripSheet.dispenses[dispenseIndex].isVerified = doc.verified.status;
                tripSheet.dispenses[dispenseIndex].isPosted = doc.posted.status;
            } else {
                tripSheet.dispenses.push({
                    transaction: doc._id,
                    fuelQuantity: doc.fuelQuantity,
                    isVerified: doc.verified.status,
                    isPosted: doc.posted.status,
                });
            }

            await tripSheet.save();
        }
    } catch (error) {
        console.error("Error in fuelingTransactionSchema post save hook:", error);
    }
});

fuelingTransactionSchema.post('deleteOne', async function (doc) {
    try {
        const tripSheet = await TripSheet.findOne({ 'dispenses.transaction': doc._id });
        if (tripSheet) {
            tripSheet.dispenses = tripSheet.dispenses.filter(
                (dispense) => dispense.transaction.toString() !== doc._id.toString()
            );

            const dispensedQuantity = tripSheet.dispenses.reduce(
                (sum, dispense) => sum + (dispense.fuelQuantity || 0), 0
            );

            tripSheet.saleQty = tripSheet.totalLoadQuantity - dispensedQuantity;
            tripSheet.balanceQty = tripSheet.totalLoadQuantity - tripSheet.saleQty;

            await tripSheet.save();
        }
    } catch (error) {
        console.error("Error in fuelingTransactionSchema post deleteOne hook:", error);
    }
});

module.exports = bowsersDatabaseConnection.model('FuelingTransaction', fuelingTransactionSchema, 'FuelingRecordsCollection');