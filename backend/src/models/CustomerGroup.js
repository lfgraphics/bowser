import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const customerGroupSchema = new Schema({
    Name: String,
    State: String,
});

customerGroupSchema.index({ Name: 1 });

const CustomerGroup = getTransportDatabaseConnection().model('CustomerGroup', customerGroupSchema, 'CustomerGroupsCollection');

// Export model methods as named exports
export const find = CustomerGroup.find.bind(CustomerGroup);
export const findOne = CustomerGroup.findOne.bind(CustomerGroup);
export const findById = CustomerGroup.findById.bind(CustomerGroup);
export const findOneAndUpdate = CustomerGroup.findOneAndUpdate.bind(CustomerGroup);
export const findByIdAndUpdate = CustomerGroup.findByIdAndUpdate.bind(CustomerGroup);
export const updateOne = CustomerGroup.updateOne.bind(CustomerGroup);
export const updateMany = CustomerGroup.updateMany.bind(CustomerGroup);
export const deleteOne = CustomerGroup.deleteOne.bind(CustomerGroup);
export const deleteMany = CustomerGroup.deleteMany.bind(CustomerGroup);
export const create = CustomerGroup.create.bind(CustomerGroup);
export const insertMany = CustomerGroup.insertMany.bind(CustomerGroup);
export const countDocuments = CustomerGroup.countDocuments.bind(CustomerGroup);
export const distinct = CustomerGroup.distinct.bind(CustomerGroup);
export const aggregate = CustomerGroup.aggregate.bind(CustomerGroup);
export const bulkWrite = CustomerGroup.bulkWrite.bind(CustomerGroup);

export default CustomerGroup;