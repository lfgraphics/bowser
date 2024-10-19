const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const formDataSchema = new mongoose.Schema({
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
        _id:  mongoose.Schema.Types.ObjectId,
        userName: String,
        userId: String
    },
});

module.exports = bowsersDatabaseConnection.model('FormData', formDataSchema, 'FuelingRecordsCollection');