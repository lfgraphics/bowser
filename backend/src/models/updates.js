import { Schema } from 'mongoose';
import moment from "moment-timezone";
import { getUsersAndRolesDatabaseConnection } from '../../config/database.js';

const updatesSchema = new Schema({
    appName: { type: String, required: true },
    buildVersion: { type: Number, required: true },
    releaseNotes: { type: String, default: "" },
    url: { type: String, required: true },
    fileSizeMB: { type: String }, // optional, fetched via Drive API
    pushDate: { type: Date, default: () => moment().tz("Asia/Kolkata").toDate() },
});

const Update = getUsersAndRolesDatabaseConnection().model('Update', updatesSchema, 'updates');

// Export model methods as named exports
export const find = Update.find.bind(Update);
export const findOne = Update.findOne.bind(Update);
export const findById = Update.findById.bind(Update);
export const findOneAndUpdate = Update.findOneAndUpdate.bind(Update);
export const findByIdAndUpdate = Update.findByIdAndUpdate.bind(Update);
export const findByIdAndDelete = Update.findByIdAndDelete.bind(Update);
export const updateOne = Update.updateOne.bind(Update);
export const updateMany = Update.updateMany.bind(Update);
export const deleteOne = Update.deleteOne.bind(Update);
export const deleteMany = Update.deleteMany.bind(Update);
export const create = Update.create.bind(Update);
export const insertMany = Update.insertMany.bind(Update);
export const countDocuments = Update.countDocuments.bind(Update);
export const distinct = Update.distinct.bind(Update);
export const aggregate = Update.aggregate.bind(Update);
export const bulkWrite = Update.bulkWrite.bind(Update);

export default Update;
