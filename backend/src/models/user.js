const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../../config/database');

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    password: String,
    deviceUUID: String,
    phoneNumber: String,
    name: String,
    verified: Boolean,
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FuelingOrder'
    }],
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    pushToken: String
});

module.exports = UsersAndRolesDatabaseConnection.model('User', userSchema, 'UsersCollection');
