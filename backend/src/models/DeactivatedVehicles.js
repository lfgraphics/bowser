import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const deactivateVehicleSchema = new Schema({
    VehicleNo: String,
    UserInfo: {
        Created: Date,
        CreatedBy: String,
        Modified: Date,
        ModifiedBy: String,
    }
}, { versionKey: false });

const DeactivatedVehicle = getTransportDatabaseConnection().model('DeactivatedVehicle', deactivateVehicleSchema, 'DeactivatedVehicles');

// Export model methods as named exports
export const find = DeactivatedVehicle.find.bind(DeactivatedVehicle);
export const findOne = DeactivatedVehicle.findOne.bind(DeactivatedVehicle);
export const findById = DeactivatedVehicle.findById.bind(DeactivatedVehicle);
export const findOneAndUpdate = DeactivatedVehicle.findOneAndUpdate.bind(DeactivatedVehicle);
export const findByIdAndUpdate = DeactivatedVehicle.findByIdAndUpdate.bind(DeactivatedVehicle);
export const findByIdAndDelete = DeactivatedVehicle.findByIdAndDelete.bind(DeactivatedVehicle);
export const updateOne = DeactivatedVehicle.updateOne.bind(DeactivatedVehicle);
export const updateMany = DeactivatedVehicle.updateMany.bind(DeactivatedVehicle);
export const deleteOne = DeactivatedVehicle.deleteOne.bind(DeactivatedVehicle);
export const deleteMany = DeactivatedVehicle.deleteMany.bind(DeactivatedVehicle);
export const create = DeactivatedVehicle.create.bind(DeactivatedVehicle);
export const insertMany = DeactivatedVehicle.insertMany.bind(DeactivatedVehicle);
export const countDocuments = DeactivatedVehicle.countDocuments.bind(DeactivatedVehicle);
export const distinct = DeactivatedVehicle.distinct.bind(DeactivatedVehicle);
export const aggregate = DeactivatedVehicle.aggregate.bind(DeactivatedVehicle);
export const bulkWrite = DeactivatedVehicle.bulkWrite.bind(DeactivatedVehicle);

export default DeactivatedVehicle;
