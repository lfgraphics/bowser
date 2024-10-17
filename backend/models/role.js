const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../config/database');

const permissionSchema = new mongoose.Schema({
    apps: [{
        name: String,
        access: {
            type: String,
            enum: ['read', 'write', 'admin', null],
            default: null
        }
    }],
    functions: [{
        name: String,
        allowed: {
            type: Boolean,
            default: null
        }
    }],
    // add more permission types here as needed
    customPermissions: mongoose.Schema.Types.Mixed
}, { _id: false });

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    permissions: permissionSchema
});

module.exports = UsersAndRolesDatabaseConnection.model('Role', roleSchema, 'RolesCollection');