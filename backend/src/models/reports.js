const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../../config/database');

const reportSchema = new mongoose.Schema({
    reportId: { type: String },
    reportMessage: { type: String, required: true },
    devPersonal: { type: String, required: true },
    reporter: { type: String, required: true }
});

module.exports = UsersAndRolesDatabaseConnection.model('Report', reportSchema, 'Reports');
