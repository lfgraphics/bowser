const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../../config/database');

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    password: String,
    deviceUUID: String,
    phoneNumber: String,
    name: String,
    verified: Boolean,
    bowserId: String,
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FuelingOrder'
    }],
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    pushToken: String,
    generationTime: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

module.exports = UsersAndRolesDatabaseConnection.model('User', userSchema, 'UsersCollection');
