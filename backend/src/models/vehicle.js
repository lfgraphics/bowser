const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const vehicleSchema = new mongoose.Schema({
    VehicleNo: String,
    tripDetails: {
        // id: mongoose.Schema.Types.ObjectId,
        driver: String,
        open: Boolean
    }
});

module.exports = transportDatabaseConnection.model('Vehicle', vehicleSchema, 'VehiclesCollection');