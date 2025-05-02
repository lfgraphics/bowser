const mongoose = require('mongoose');
const moment = require("moment-timezone");
const { UsersAndRolesDatabaseConnection } = require('../../config/database');

const updatesSchema = new mongoose.Schema({
    appName: { type: String, required: true },
    buildVersion: { type: Number, required: true },
    releaseNotes: { type: String, default: "" },
    url: { type: String, required: true },
    fileSizeMB: { type: String }, // optional, fetched via Drive API
    pushDate: { type: Date, default: () => moment().tz("Asia/Kolkata").toDate() },
});

module.exports = UsersAndRolesDatabaseConnection.model('Update', updatesSchema, 'updates');
