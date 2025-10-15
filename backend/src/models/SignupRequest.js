import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const signupRequestSchema = new Schema({
    vehicleNo: String,
    phoneNumber: String,
    deviceUUID: String,
    pushToken: String,
    generationTime: { type: Date },
});

const SignupRequest = getTransportDatabaseConnection().model('SignupRequest', signupRequestSchema, 'SignupRequeests');

// Export model methods as named exports
export const find = SignupRequest.find.bind(SignupRequest);
export const findOne = SignupRequest.findOne.bind(SignupRequest);
export const findById = SignupRequest.findById.bind(SignupRequest);
export const findOneAndUpdate = SignupRequest.findOneAndUpdate.bind(SignupRequest);
export const findByIdAndUpdate = SignupRequest.findByIdAndUpdate.bind(SignupRequest);
export const findByIdAndDelete = SignupRequest.findByIdAndDelete.bind(SignupRequest);
export const findOneAndDelete = SignupRequest.findOneAndDelete.bind(SignupRequest);
export const updateOne = SignupRequest.updateOne.bind(SignupRequest);
export const updateMany = SignupRequest.updateMany.bind(SignupRequest);
export const deleteOne = SignupRequest.deleteOne.bind(SignupRequest);
export const deleteMany = SignupRequest.deleteMany.bind(SignupRequest);
export const create = SignupRequest.create.bind(SignupRequest);
export const insertMany = SignupRequest.insertMany.bind(SignupRequest);
export const countDocuments = SignupRequest.countDocuments.bind(SignupRequest);
export const distinct = SignupRequest.distinct.bind(SignupRequest);
export const aggregate = SignupRequest.aggregate.bind(SignupRequest);
export const bulkWrite = SignupRequest.bulkWrite.bind(SignupRequest);

export default SignupRequest;