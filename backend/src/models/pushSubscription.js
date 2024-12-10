const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../../config/database');
const moment = require("moment-timezone");

const pushSubscriptionSchema = new mongoose.Schema({
    mobileNumber: { type: String, required: true },
    subscription: { type: Object, required: true },
    platform: { type: String, default: 'web' },
    createdAt: { type: Date, default: () => moment().tz("Asia/Kolkata").toDate() },
});

module.exports = UsersAndRolesDatabaseConnection.model('PushSubscription', pushSubscriptionSchema, 'PushSubscriptionsCollection');