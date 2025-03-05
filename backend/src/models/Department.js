const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../../config/database');

const departmentSchema = new mongoose.Schema({
    id: String,
    name: String
});

module.exports = UsersAndRolesDatabaseConnection.model('Department', departmentSchema, 'RolesCollection');
