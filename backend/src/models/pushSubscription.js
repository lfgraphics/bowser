const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../../config/database');

const pushSubscriptionSchema = new mongoose.Schema({
    mobileNumber: { type: String, required: true },
    subscription: { type: Object, required: true },
    platform: { type: String, default: 'web' },
    createdAt: { type: Date, default: Date.now, timezone: 'Asia/Kolkata' },
});

module.exports = UsersAndRolesDatabaseConnection.model('PushSubscription', pushSubscriptionSchema, 'PushSubscriptionsCollection');