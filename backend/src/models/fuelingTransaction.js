const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const fuelingTransactionSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, required: false },
    tripSheetId: { type: String},
    vehicleNumberPlateImage: { type: String, required: false },
    vehicleNumber: { type: String, required: true },
    driverId: { type: String, required: false },
    driverName: { type: String, required: true },
    driverMobile: { type: String, required: false },
    fuelMeterImage: { type: String, required: false },
    slipImage: { type: String, required: false },
    quantityType: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return v === 'Full' || v === 'Part';
            },
            message: 'Quantity type must be either Full or Part'
        }
    },
    fuelQuantity: { type: String, required: true },
    gpsLocation: { type: String, required: false },
    fuelingDateTime: { type: String, required: false },
    bowser: {
        regNo: { type: String, require: false },
        driver: {
            name: { type: String, required: false },
            id: { type: String, required: false },
            phoneNo: { type: String, required: false }
        },
    },
    allocationAdmin: {
        name: { type: String, required: false },
        id: { type: String, required: false },
        allocationTime: { type: String, require: false }
    }
});

module.exports = bowsersDatabaseConnection.model('FuelingTransaction', fuelingTransactionSchema, 'FuelingRecordsCollection');