const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const formDataSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: false },
    orderId: mongoose.Schema.Types.ObjectId,
    vehicleNumberPlateImage: String,
    vehicleNumber: String,
    driverName: String,
    driverId: String,
    driverMobile: String,
    fuelMeterImage: String,
    slipImage: String,
    fuelQuantity: String,
    quantityType: String,
    gpsLocation: String,
    fuelingDateTime: String,
    bowserDriver: {
        _id: mongoose.Schema.Types.ObjectId,
        userName: String,
        userId: String
    },
    allocationAdmin: {
        _id: { type: mongoose.Schema.Types.ObjectId, required: false },
        userName: { type: String, required: false },
        userId: { type: String, required: false },
        location: String
    }
});

module.exports = bowsersDatabaseConnection.model('FormData', formDataSchema, 'FuelingRecordsCollection');