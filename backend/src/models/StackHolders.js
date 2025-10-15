import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const stackHoldersSchema = new Schema({
    InstitutionName: String,
    IsBillingParty: { type: Boolean, default: true },
    IsConsignee: { type: Boolean, default: true },
    IsConsigner: { type: Boolean, default: true },
    Location: String,
    shortName: String,
    loadingSupervisor: String
}, { versionKey: false });

const StackHolder = getTransportDatabaseConnection().model('StackHolder', stackHoldersSchema, 'StackHolders');

// Export model methods as named exports
export const find = StackHolder.find.bind(StackHolder);
export const findOne = StackHolder.findOne.bind(StackHolder);
export const findById = StackHolder.findById.bind(StackHolder);
export const findOneAndUpdate = StackHolder.findOneAndUpdate.bind(StackHolder);
export const findByIdAndUpdate = StackHolder.findByIdAndUpdate.bind(StackHolder);
export const findByIdAndDelete = StackHolder.findByIdAndDelete.bind(StackHolder);
export const updateOne = StackHolder.updateOne.bind(StackHolder);
export const updateMany = StackHolder.updateMany.bind(StackHolder);
export const deleteOne = StackHolder.deleteOne.bind(StackHolder);
export const deleteMany = StackHolder.deleteMany.bind(StackHolder);
export const create = StackHolder.create.bind(StackHolder);
export const insertMany = StackHolder.insertMany.bind(StackHolder);
export const countDocuments = StackHolder.countDocuments.bind(StackHolder);
export const distinct = StackHolder.distinct.bind(StackHolder);
export const aggregate = StackHolder.aggregate.bind(StackHolder);
export const bulkWrite = StackHolder.bulkWrite.bind(StackHolder);

export default StackHolder;
