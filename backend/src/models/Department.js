import { Schema } from 'mongoose';
import { getUsersAndRolesDatabaseConnection } from '../../config/database.js';

const departmentSchema = new Schema({
    id: String,
    name: String
});

const Department = getUsersAndRolesDatabaseConnection().model('Department', departmentSchema, 'DepartmentsCollection');

// Export model methods as named exports
export const find = Department.find.bind(Department);
export const findOne = Department.findOne.bind(Department);
export const findById = Department.findById.bind(Department);
export const findOneAndUpdate = Department.findOneAndUpdate.bind(Department);
export const findByIdAndUpdate = Department.findByIdAndUpdate.bind(Department);
export const findByIdAndDelete = Department.findByIdAndDelete.bind(Department);
export const updateOne = Department.updateOne.bind(Department);
export const updateMany = Department.updateMany.bind(Department);
export const deleteOne = Department.deleteOne.bind(Department);
export const deleteMany = Department.deleteMany.bind(Department);
export const create = Department.create.bind(Department);
export const insertMany = Department.insertMany.bind(Department);
export const countDocuments = Department.countDocuments.bind(Department);
export const distinct = Department.distinct.bind(Department);
export const aggregate = Department.aggregate.bind(Department);
export const bulkWrite = Department.bulkWrite.bind(Department);

export default Department;
