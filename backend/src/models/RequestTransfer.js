import { Schema } from 'mongoose';
import { getUsersAndRolesDatabaseConnection } from '../../config/database.js';

const cancellationSchema = new Schema({
    by: { type: String, required: true },
    reason: { type: String, default: "Back to work" },
    time: { type: Date, required: false },
}, { _id: false });

const requestTransferSchema = new Schema({
    by: { type: String, required: true },
    to: { type: String, required: true },
    transferReason: { type: String, required: true },
    accepted: { type: Boolean, default: false },
    fulfilled: { type: Boolean, default: false },
    cancellation: { type: cancellationSchema, required: false },
    generationTime: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

requestTransferSchema.pre('save', function (next) {
    if (this.cancellation?.by && !this.cancellation.time) {
        this.cancellation.time = new Date();
    }
    next();
});

const RequestTransfer = getUsersAndRolesDatabaseConnection().model('RequestTransfer', requestTransferSchema, 'RequestTransfer');

// Export model methods as named exports
export const find = RequestTransfer.find.bind(RequestTransfer);
export const findOne = RequestTransfer.findOne.bind(RequestTransfer);
export const findById = RequestTransfer.findById.bind(RequestTransfer);
export const findOneAndUpdate = RequestTransfer.findOneAndUpdate.bind(RequestTransfer);
export const findByIdAndUpdate = RequestTransfer.findByIdAndUpdate.bind(RequestTransfer);
export const findByIdAndDelete = RequestTransfer.findByIdAndDelete.bind(RequestTransfer);
export const updateOne = RequestTransfer.updateOne.bind(RequestTransfer);
export const updateMany = RequestTransfer.updateMany.bind(RequestTransfer);
export const deleteOne = RequestTransfer.deleteOne.bind(RequestTransfer);
export const deleteMany = RequestTransfer.deleteMany.bind(RequestTransfer);
export const create = RequestTransfer.create.bind(RequestTransfer);
export const insertMany = RequestTransfer.insertMany.bind(RequestTransfer);
export const countDocuments = RequestTransfer.countDocuments.bind(RequestTransfer);
export const distinct = RequestTransfer.distinct.bind(RequestTransfer);
export const aggregate = RequestTransfer.aggregate.bind(RequestTransfer);
export const bulkWrite = RequestTransfer.bulkWrite.bind(RequestTransfer);

export default RequestTransfer;
