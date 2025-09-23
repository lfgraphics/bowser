const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../../config/database');
// const moment = require("moment-timezone");

const pushSubscriptionSchema = new mongoose.Schema({
    mobileNumber: { type: String, required: false },
    userId: { type: String, required: false },
    groups: [{ type: String, required: false }],
    subscription: { type: Object, required: true },
    platform: { type: String, default: 'web' },
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

module.exports = UsersAndRolesDatabaseConnection.model('PushSubscription', pushSubscriptionSchema, 'PushSubscriptionsCollection');