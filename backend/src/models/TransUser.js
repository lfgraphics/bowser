const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const transAppUserSchema = new mongoose.Schema({
    UserName:String,
    Password:String,
    Photo: Buffer,
    Division: Number,
    myVehicles:[String]
});

module.exports = transportDatabaseConnection.model('TransAppUser', transAppUserSchema, 'TransAppUsers');