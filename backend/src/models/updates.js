const mongoose = require('mongoose');
const moment = require("moment-timezone");
const { UsersAndRolesDatabaseConnection } = require('../../config/database');

const updatesSchema = new mongoose.Schema({
    buildVersion: Number,
    url: String,
    pushDate: { type: Date, default: () => moment().tz("Asia/Kolkata").toDate() }
});

module.exports = UsersAndRolesDatabaseConnection.model('Update', updatesSchema, 'updates');
