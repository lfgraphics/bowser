const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../config/database');

const userSchema = new mongoose.Schema({
    userId: String,
    password: String,
    deviceUUID: String,
    phoneNumber: String,
    name: String,
    verified: Boolean,
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }]
});

module.exports = UsersAndRolesDatabaseConnection.model('User', userSchema, 'UsersCollection');