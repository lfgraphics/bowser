import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const locationSchema = new Schema({
    name: { type: String, required: true },
    pinCode: { type: String, required: false },
    state: { type: String, required: false },
    destrict: { type: Schema.Types.ObjectId, ref: "Destrict", required: false }
});

locationSchema.index({ name: 1 });

const Location = getTransportDatabaseConnection().model('Location', locationSchema, 'LocationsCollection');

// Export model methods as named exports
export const find = Location.find.bind(Location);
export const findOne = Location.findOne.bind(Location);
export const findById = Location.findById.bind(Location);
export const findOneAndUpdate = Location.findOneAndUpdate.bind(Location);
export const findByIdAndUpdate = Location.findByIdAndUpdate.bind(Location);
export const updateOne = Location.updateOne.bind(Location);
export const updateMany = Location.updateMany.bind(Location);
export const deleteOne = Location.deleteOne.bind(Location);
export const deleteMany = Location.deleteMany.bind(Location);
export const create = Location.create.bind(Location);
export const insertMany = Location.insertMany.bind(Location);
export const countDocuments = Location.countDocuments.bind(Location);
export const distinct = Location.distinct.bind(Location);
export const aggregate = Location.aggregate.bind(Location);
export const bulkWrite = Location.bulkWrite.bind(Location);

export default Location;