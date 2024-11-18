const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const tripVehicleSchema = new mongoose.Schema({
    StartDriver: String,
    VehicleNo: String,
});

module.exports = transportDatabaseConnection.model('TripVehicle', tripVehicleSchema, 'TripDataCollection');
