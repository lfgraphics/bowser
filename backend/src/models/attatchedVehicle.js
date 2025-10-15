import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const attachedVehicleSchema = new Schema({
    VehicleNo: String,
    TransportPartenName: String,
});

const AttachedVehicle = getTransportDatabaseConnection().model('AttachedVehicle', attachedVehicleSchema, 'AttatchedVehiclesCollection');

// Export model methods as named exports
export const find = AttachedVehicle.find.bind(AttachedVehicle);
export const findOne = AttachedVehicle.findOne.bind(AttachedVehicle);
export const findById = AttachedVehicle.findById.bind(AttachedVehicle);
export const findOneAndUpdate = AttachedVehicle.findOneAndUpdate.bind(AttachedVehicle);
export const findByIdAndUpdate = AttachedVehicle.findByIdAndUpdate.bind(AttachedVehicle);
export const updateOne = AttachedVehicle.updateOne.bind(AttachedVehicle);
export const updateMany = AttachedVehicle.updateMany.bind(AttachedVehicle);
export const deleteOne = AttachedVehicle.deleteOne.bind(AttachedVehicle);
export const deleteMany = AttachedVehicle.deleteMany.bind(AttachedVehicle);
export const create = AttachedVehicle.create.bind(AttachedVehicle);
export const insertMany = AttachedVehicle.insertMany.bind(AttachedVehicle);
export const countDocuments = AttachedVehicle.countDocuments.bind(AttachedVehicle);
export const distinct = AttachedVehicle.distinct.bind(AttachedVehicle);
export const aggregate = AttachedVehicle.aggregate.bind(AttachedVehicle);
export const bulkWrite = AttachedVehicle.bulkWrite.bind(AttachedVehicle);

export default AttachedVehicle;