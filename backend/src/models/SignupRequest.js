const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const signupRequestSchema = new mongoose.Schema({
    phoneNumber: String,
    deviceUUID: String,
    pushToken: String,
    generationTime: { type: Date },
});

module.exports = transportDatabaseConnection.model('SignupRequest', signupRequestSchema, 'DriversCollection');