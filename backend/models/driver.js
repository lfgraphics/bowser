const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../config/database');

const driverSchema = new mongoose.Schema({
    Name: String,
    ITPLId: String,
    MobileNo: [{
        MobileNo: String,
        IsDefaultNumber: Boolean,
        LastUsed: Boolean
    }]
});

module.exports = transportDatabaseConnection.model('Driver', driverSchema, 'DriversCollection');