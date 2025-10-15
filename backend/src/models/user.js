import { Schema } from 'mongoose';
import './Department.js';
import { getUsersAndRolesDatabaseConnection } from '../../config/database.js';

const userSchema = new Schema({
    userId: { type: String, unique: true },
    password: String,
    deviceUUID: String,
    phoneNumber: { type: String, unique: true },
    name: String,
    verified: Boolean,
    bowserId: String,
    resetToken: String,
    resetTokenExpiry: Date,
    orders: [{
        type: Schema.Types.ObjectId,
        ref: 'FuelingOrder'
    }],
    roles: [{
        type: Schema.Types.ObjectId,
        ref: 'Role'
    }],
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    generationTime: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

const User = getUsersAndRolesDatabaseConnection().model('User', userSchema, 'UsersCollection');

// Export model methods as named exports
export const find = User.find.bind(User);
export const findOne = User.findOne.bind(User);
export const findById = User.findById.bind(User);
export const findOneAndUpdate = User.findOneAndUpdate.bind(User);
export const findByIdAndUpdate = User.findByIdAndUpdate.bind(User);
export const findByIdAndDelete = User.findByIdAndDelete.bind(User);
export const updateOne = User.updateOne.bind(User);
export const updateMany = User.updateMany.bind(User);
export const deleteOne = User.deleteOne.bind(User);
export const deleteMany = User.deleteMany.bind(User);
export const create = User.create.bind(User);
export const insertMany = User.insertMany.bind(User);
export const countDocuments = User.countDocuments.bind(User);
export const distinct = User.distinct.bind(User);
export const aggregate = User.aggregate.bind(User);
export const bulkWrite = User.bulkWrite.bind(User);

export default User;
