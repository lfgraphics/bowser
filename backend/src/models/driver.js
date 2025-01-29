const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const driverSchema = new mongoose.Schema({
    Name: String,
    ITPLId: String,
    MobileNo: [{
        MobileNo: String,
        IsDefaultNumber: Boolean,
        LastUsed: Boolean
    }, { _id: false }],
    password: String,
    deviceUUID: String,
    resetToken: String,
    resetTokenExpiry: Date,
    roles: [String],
    verified: Boolean,
    pushToken: String,
    generationTime: { type: Date },
});

module.exports = transportDatabaseConnection.model('Driver', driverSchema, 'DriversCollection');