import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const transAppUserSchema = new Schema({
    UserName: String,
    phoneNumber: { type: String, unique: true },
    hashed: { type: Boolean, default: false },
    Password: String,
    Photo: Buffer,
    Division: Number,
    myVehicles: [String]
});

const TransAppUser = getTransportDatabaseConnection().model('TransAppUser', transAppUserSchema, 'TransAppUsers');

// Export model methods as named exports
export const find = TransAppUser.find.bind(TransAppUser);
export const findOne = TransAppUser.findOne.bind(TransAppUser);
export const findById = TransAppUser.findById.bind(TransAppUser);
export const findOneAndUpdate = TransAppUser.findOneAndUpdate.bind(TransAppUser);
export const findByIdAndUpdate = TransAppUser.findByIdAndUpdate.bind(TransAppUser);
export const findByIdAndDelete = TransAppUser.findByIdAndDelete.bind(TransAppUser);
export const updateOne = TransAppUser.updateOne.bind(TransAppUser);
export const updateMany = TransAppUser.updateMany.bind(TransAppUser);
export const deleteOne = TransAppUser.deleteOne.bind(TransAppUser);
export const deleteMany = TransAppUser.deleteMany.bind(TransAppUser);
export const create = TransAppUser.create.bind(TransAppUser);
export const insertMany = TransAppUser.insertMany.bind(TransAppUser);
export const countDocuments = TransAppUser.countDocuments.bind(TransAppUser);
export const distinct = TransAppUser.distinct.bind(TransAppUser);
export const aggregate = TransAppUser.aggregate.bind(TransAppUser);
export const bulkWrite = TransAppUser.bulkWrite.bind(TransAppUser);

export default TransAppUser;