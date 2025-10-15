import { Schema } from 'mongoose';
import { getBowsersDatabaseConnection } from '../../config/database.js';

const fuelingTransactionSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, required: false, ref: 'FuelingOrder' },
    tripId: { type: String, required: false },
    category: {
        type: String, require: false,
        default: "Own",
        validate: {
            validator: function (v) {
                return v === 'Own' || v === 'Attatch' || v === 'Bulk Sale';
            },
            message: 'Fueling category must be either Bulk Sale or Attatch or Own'
        }
    },
    party: { type: String, require: true, default: "Own" },
    odometer: { type: Number },
    tripSheetId: { type: Number, require: true },
    vehicleNumberPlateImage: { type: String, required: false },
    vehicleNumber: { type: String, required: false },
    driverId: { type: String, required: false },
    driverName: { type: String, required: false },
    driverMobile: { type: String, required: false },
    fuelMeterImage: { type: [String], _id: false, required: false },
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
    fuelQuantity: { type: Number, required: true },
    cost: { type: Number },
    gpsLocation: { type: String, required: false },
    location: { type: String, required: true },
    fuelingDateTime: { type: Date, required: true },
    bowser: {
        regNo: { type: String, require: true },
        driver: {
            name: { type: String, required: false },
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
        allocationTime: { type: Date, require: false }
    }
});

fuelingTransactionSchema.post('deleteOne', async function (doc) {
    const { TripSheet } = await import('./TripSheets.js').then(module => module.default);
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

// Define the model
const FuelingTransaction = getBowsersDatabaseConnection().model('FuelingTransaction', fuelingTransactionSchema, 'FuelingRecordsCollection');

// Named exports
export { FuelingTransaction, fuelingTransactionSchema };

// Default export for backward compatibility
export default {
    FuelingTransaction,
    fuelingTransactionSchema
};
