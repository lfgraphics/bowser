import { Schema } from 'mongoose';
import { getBowsersDatabaseConnection } from '../../config/database.js';

const fuelStationSchema = new Schema({
    name: { type: String, required: true },
})

const FuelStation = getBowsersDatabaseConnection().model('FuelStation', fuelStationSchema, 'FuelStations');

// Export model methods as named exports
export const find = FuelStation.find.bind(FuelStation);
export const findOne = FuelStation.findOne.bind(FuelStation);
export const findById = FuelStation.findById.bind(FuelStation);
export const findOneAndUpdate = FuelStation.findOneAndUpdate.bind(FuelStation);
export const findByIdAndUpdate = FuelStation.findByIdAndUpdate.bind(FuelStation);
export const findByIdAndDelete = FuelStation.findByIdAndDelete.bind(FuelStation);
export const updateOne = FuelStation.updateOne.bind(FuelStation);
export const updateMany = FuelStation.updateMany.bind(FuelStation);
export const deleteOne = FuelStation.deleteOne.bind(FuelStation);
export const deleteMany = FuelStation.deleteMany.bind(FuelStation);
export const create = FuelStation.create.bind(FuelStation);
export const insertMany = FuelStation.insertMany.bind(FuelStation);
export const countDocuments = FuelStation.countDocuments.bind(FuelStation);
export const distinct = FuelStation.distinct.bind(FuelStation);
export const aggregate = FuelStation.aggregate.bind(FuelStation);
export const bulkWrite = FuelStation.bulkWrite.bind(FuelStation);

export default FuelStation;
