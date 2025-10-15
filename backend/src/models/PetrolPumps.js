import { Schema } from 'mongoose';
import { getBowsersDatabaseConnection } from '../../config/database.js';

const petrolPumpSchema = new Schema({
    name: { type: String, required: true },
    state: { type: String, required: false },
}, { timestamps: true });

const PetrolPump = getBowsersDatabaseConnection().model('PetrolPump', petrolPumpSchema, 'PetrolPumps');

// Export model methods as named exports
export const find = PetrolPump.find.bind(PetrolPump);
export const findOne = PetrolPump.findOne.bind(PetrolPump);
export const findById = PetrolPump.findById.bind(PetrolPump);
export const findOneAndUpdate = PetrolPump.findOneAndUpdate.bind(PetrolPump);
export const findByIdAndUpdate = PetrolPump.findByIdAndUpdate.bind(PetrolPump);
export const findByIdAndDelete = PetrolPump.findByIdAndDelete.bind(PetrolPump);
export const updateOne = PetrolPump.updateOne.bind(PetrolPump);
export const updateMany = PetrolPump.updateMany.bind(PetrolPump);
export const deleteOne = PetrolPump.deleteOne.bind(PetrolPump);
export const deleteMany = PetrolPump.deleteMany.bind(PetrolPump);
export const create = PetrolPump.create.bind(PetrolPump);
export const insertMany = PetrolPump.insertMany.bind(PetrolPump);
export const countDocuments = PetrolPump.countDocuments.bind(PetrolPump);
export const distinct = PetrolPump.distinct.bind(PetrolPump);
export const aggregate = PetrolPump.aggregate.bind(PetrolPump);
export const bulkWrite = PetrolPump.bulkWrite.bind(PetrolPump);

export default PetrolPump;