import { Schema } from 'mongoose';
import { getUsersAndRolesDatabaseConnection } from '../../config/database.js';

const permissionSchema = new Schema({
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
    customPermissions: Schema.Types.Mixed
}, { _id: false });

const roleSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    permissions: permissionSchema
});

const Role = getUsersAndRolesDatabaseConnection().model('Role', roleSchema, 'RolesCollection');

// Export model methods as named exports
export const find = Role.find.bind(Role);
export const findOne = Role.findOne.bind(Role);
export const findById = Role.findById.bind(Role);
export const findOneAndUpdate = Role.findOneAndUpdate.bind(Role);
export const findByIdAndUpdate = Role.findByIdAndUpdate.bind(Role);
export const findByIdAndDelete = Role.findByIdAndDelete.bind(Role);
export const updateOne = Role.updateOne.bind(Role);
export const updateMany = Role.updateMany.bind(Role);
export const deleteOne = Role.deleteOne.bind(Role);
export const deleteMany = Role.deleteMany.bind(Role);
export const create = Role.create.bind(Role);
export const insertMany = Role.insertMany.bind(Role);
export const countDocuments = Role.countDocuments.bind(Role);
export const distinct = Role.distinct.bind(Role);
export const aggregate = Role.aggregate.bind(Role);
export const bulkWrite = Role.bulkWrite.bind(Role);

export default Role;