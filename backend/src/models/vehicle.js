const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const vehicleSchema = new mongoose.Schema({
    VehicleNo: String,
    tripDetails: {
        id: { type: mongoose.Schema.Types.ObjectId, required: false },
        driver: { type: String, required: true },
        open: { type: Boolean, required: false },
        from: { type: String, required: false },
        to: { type: String, required: false },
        startedOn: { type: String, required: false },
        loadStatus: { type: String, required: false }
    },
    operationManager: String,
    capacity: String,
    GoodsCategory: String,
    manager: String
});

module.exports = transportDatabaseConnection.model('Vehicle', vehicleSchema, 'VehiclesCollection');