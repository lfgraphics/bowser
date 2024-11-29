const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

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
    odometer: { type: String },
    tripSheetId: { type: String },
    vehicleNumberPlateImage: { type: String, required: false },
    vehicleNumber: { type: String, required: false },
    driverId: { type: String, required: false },
    driverName: { type: String, required: false },
    driverMobile: { type: String, required: false },
    fuelMeterImage: { type: [String], required: true },
    slipImage: { type: String, required: false },
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
    fuelQuantity: { type: String, required: false },
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
            id: { type: String, required: false },
            phoneNo: { type: String, required: false }
        },
    },
    verified: { type: Boolean, default: false },
    posted: { type: Boolean, default: false },
    allocationAdmin: {
        name: { type: String, required: false },
        id: { type: String, required: false },
        allocationTime: { type: String, require: false }
    }
});

module.exports = bowsersDatabaseConnection.model('FuelingTransaction', fuelingTransactionSchema, 'FuelingRecordsCollection');