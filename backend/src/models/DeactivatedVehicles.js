const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const deactivateVehicleSchema = new mongoose.Schema({
    VehicleNo: String,
    UserInfo: {
        Created: Date,
        CreatedBy: String,
        Modified: Date,
        ModifiedBy: String,
    }
}, { versionKey: false });

module.exports = transportDatabaseConnection.model('DeactivatedVehicle', deactivateVehicleSchema, 'DeactivatedVehicles');
