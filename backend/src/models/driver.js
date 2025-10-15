import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const driverSchema = new Schema({
    Name: String,
    ITPLId: String,
    MobileNo: [{
        MobileNo: String,
        IsDefaultNumber: Boolean,
        LastUsed: Boolean
    }, { _id: false }],
    password: String,
    deviceUUID: String,
    resetToken: String,
    resetTokenExpiry: Date,
    roles: [String],
    verified: Boolean,
    keypad: Boolean,
    inActive: { type: Boolean, default: false },
    pushToken: String,
    generationTime: { type: Date },
});

const Driver = getTransportDatabaseConnection().model('Driver', driverSchema, 'DriversCollection');

// Export model methods as named exports
export const find = Driver.find.bind(Driver);
export const findOne = Driver.findOne.bind(Driver);
export const findById = Driver.findById.bind(Driver);
export const findOneAndUpdate = Driver.findOneAndUpdate.bind(Driver);
export const findByIdAndUpdate = Driver.findByIdAndUpdate.bind(Driver);
export const updateOne = Driver.updateOne.bind(Driver);
export const updateMany = Driver.updateMany.bind(Driver);
export const deleteOne = Driver.deleteOne.bind(Driver);
export const deleteMany = Driver.deleteMany.bind(Driver);
export const create = Driver.create.bind(Driver);
export const insertMany = Driver.insertMany.bind(Driver);
export const countDocuments = Driver.countDocuments.bind(Driver);
export const distinct = Driver.distinct.bind(Driver);
export const aggregate = Driver.aggregate.bind(Driver);
export const bulkWrite = Driver.bulkWrite.bind(Driver);

export default Driver;