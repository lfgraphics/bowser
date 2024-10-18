const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const formDataSchema = new mongoose.Schema({
    vehicleNumberPlateImage: String,
    vehicleNumber: String,
    driverName: String,
    driverId: String,
    driverMobile: String,
    fuelMeterImage: String,
    fuelQuantity: String,
    gpsLocation: String,
    fuelingDateTime: String
});

module.exports = bowsersDatabaseConnection.model('FormData', formDataSchema, 'FuelingRecordsCollection');