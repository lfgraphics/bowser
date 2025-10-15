import { Schema } from 'mongoose';
import { getBowsersDatabaseConnection } from '../../config/database.js';

const saleryCalcSchema = new Schema({
    foodingRate: { type: Number, required: true },
    saleryRate: { type: Number, required: true },
    rewardRate: { type: Number, required: true }
});

const SaleryCalc = getBowsersDatabaseConnection().model('SaleryCalc', saleryCalcSchema, 'CountersCollection');

// Export model methods as named exports
export const find = SaleryCalc.find.bind(SaleryCalc);
export const findOne = SaleryCalc.findOne.bind(SaleryCalc);
export const findById = SaleryCalc.findById.bind(SaleryCalc);
export const findOneAndUpdate = SaleryCalc.findOneAndUpdate.bind(SaleryCalc);
export const findByIdAndUpdate = SaleryCalc.findByIdAndUpdate.bind(SaleryCalc);
export const findByIdAndDelete = SaleryCalc.findByIdAndDelete.bind(SaleryCalc);
export const updateOne = SaleryCalc.updateOne.bind(SaleryCalc);
export const updateMany = SaleryCalc.updateMany.bind(SaleryCalc);
export const deleteOne = SaleryCalc.deleteOne.bind(SaleryCalc);
export const deleteMany = SaleryCalc.deleteMany.bind(SaleryCalc);
export const create = SaleryCalc.create.bind(SaleryCalc);
export const insertMany = SaleryCalc.insertMany.bind(SaleryCalc);
export const countDocuments = SaleryCalc.countDocuments.bind(SaleryCalc);
export const distinct = SaleryCalc.distinct.bind(SaleryCalc);
export const aggregate = SaleryCalc.aggregate.bind(SaleryCalc);
export const bulkWrite = SaleryCalc.bulkWrite.bind(SaleryCalc);

export default SaleryCalc;