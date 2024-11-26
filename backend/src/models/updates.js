const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../../config/database');

const updatesSchema = new mongoose.Schema({
    buildVersion: Number,
    url: String,
    pushDate: Date
});

module.exports = UsersAndRolesDatabaseConnection.model('Update', updatesSchema, 'updates');
