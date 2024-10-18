const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../config/database');

const vehicleSchema = new mongoose.Schema({
    vehicleNumber: {
        type: String,
        required: true,
        unique: true
    },
    type: String,
    capacity: Number,
    lastMaintenanceDate: Date
});

module.exports = transportDatabaseConnection.model('Vehicle', vehicleSchema, 'VehiclesCollection');