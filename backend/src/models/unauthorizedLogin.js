import { Schema } from 'mongoose';
import { getUsersAndRolesDatabaseConnection } from '../../config/database.js';

const unauthorizedLoginSchema = new Schema({
  userId: String,
  name: String,
  phoneNumber: String,
  registeredDeviceUUID: String,
  attemptedDeviceUUID: String,
  timestamp: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

const UnAuthorizedLogin = getUsersAndRolesDatabaseConnection().model('UnAuthorizedLogin', unauthorizedLoginSchema, 'UnauthorizedLoginCollection');

// Export model methods as named exports
export const find = UnAuthorizedLogin.find.bind(UnAuthorizedLogin);
export const findOne = UnAuthorizedLogin.findOne.bind(UnAuthorizedLogin);
export const findById = UnAuthorizedLogin.findById.bind(UnAuthorizedLogin);
export const findOneAndUpdate = UnAuthorizedLogin.findOneAndUpdate.bind(UnAuthorizedLogin);
export const findByIdAndUpdate = UnAuthorizedLogin.findByIdAndUpdate.bind(UnAuthorizedLogin);
export const findByIdAndDelete = UnAuthorizedLogin.findByIdAndDelete.bind(UnAuthorizedLogin);
export const updateOne = UnAuthorizedLogin.updateOne.bind(UnAuthorizedLogin);
export const updateMany = UnAuthorizedLogin.updateMany.bind(UnAuthorizedLogin);
export const deleteOne = UnAuthorizedLogin.deleteOne.bind(UnAuthorizedLogin);
export const deleteMany = UnAuthorizedLogin.deleteMany.bind(UnAuthorizedLogin);
export const create = UnAuthorizedLogin.create.bind(UnAuthorizedLogin);
export const insertMany = UnAuthorizedLogin.insertMany.bind(UnAuthorizedLogin);
export const countDocuments = UnAuthorizedLogin.countDocuments.bind(UnAuthorizedLogin);
export const distinct = UnAuthorizedLogin.distinct.bind(UnAuthorizedLogin);
export const aggregate = UnAuthorizedLogin.aggregate.bind(UnAuthorizedLogin);
export const bulkWrite = UnAuthorizedLogin.bulkWrite.bind(UnAuthorizedLogin);

export default UnAuthorizedLogin;