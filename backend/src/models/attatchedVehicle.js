const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const attachedVehicleSchema = new mongoose.Schema({
    VehicleNo: String,
    TransportPartenName: String,
});

module.exports = transportDatabaseConnection.model('AttachedVehicle', attachedVehicleSchema, 'AttatchedVehiclesCollection');