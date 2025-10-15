import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const campUserTransactionSchema = new Schema({
    transactionDate: { type: Date, required: true },
    category: { enum: ['self', 'vehicle'], type: String, required: true },
    head: { type: String, required: true, trim: true },
    narration: { type: String, required: false, trim: true },
    amount: { type: Number, required: true },
    approved: {
        type: {
            amount: { type: Number, required: false },
            date: { type: Date, required: false },
            approvedBy: { type: Schema.Types.ObjectId, ref: 'CampUser', required: false }
        }, required: false
    },
    billImage: { type: String, required: false, trim: true },
    vehicleNumber: { type: String, required: function () { return this.category === 'vehicle'; }, trim: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'TankersTrip', required: false },
    driver: { type: String, required: function () { return this.category === 'vehicle'; }, trim: true },
    remarks: { type: String, required: false, trim: true },
    user: {
        _id: { type: Schema.Types.ObjectId, ref: 'CampUser', required: true },
        name: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
campUserTransactionSchema.index({ forDate: -1 });
campUserTransactionSchema.index({ category: 1 });
campUserTransactionSchema.index({ vehicleNumber: 1 });
campUserTransactionSchema.index({ driver: 1 });
campUserTransactionSchema.index({ 'user._id': 1 });
campUserTransactionSchema.index({ 'user.name': 1 });
campUserTransactionSchema.index({ 'expense.name': 1 });
campUserTransactionSchema.index({ createdAt: -1 });
campUserTransactionSchema.index({ updatedAt: -1 });

// Pre-save middleware to update updatedAt
campUserTransactionSchema.pre('save', function (next) {
    if (!this.isNew) {
        this.updatedAt = Date.now();
    }
    next();
});

const CampTransaction = getTransportDatabaseConnection().model('CampTransaction', campUserTransactionSchema, 'CampTransactions');

// Export model methods as named exports
export const find = CampTransaction.find.bind(CampTransaction);
export const findOne = CampTransaction.findOne.bind(CampTransaction);
export const findById = CampTransaction.findById.bind(CampTransaction);
export const findOneAndUpdate = CampTransaction.findOneAndUpdate.bind(CampTransaction);
export const findByIdAndUpdate = CampTransaction.findByIdAndUpdate.bind(CampTransaction);
export const findByIdAndDelete = CampTransaction.findByIdAndDelete.bind(CampTransaction);
export const findOneAndDelete = CampTransaction.findOneAndDelete.bind(CampTransaction);
export const updateOne = CampTransaction.updateOne.bind(CampTransaction);
export const updateMany = CampTransaction.updateMany.bind(CampTransaction);
export const deleteOne = CampTransaction.deleteOne.bind(CampTransaction);
export const deleteMany = CampTransaction.deleteMany.bind(CampTransaction);
export const create = CampTransaction.create.bind(CampTransaction);
export const insertMany = CampTransaction.insertMany.bind(CampTransaction);
export const countDocuments = CampTransaction.countDocuments.bind(CampTransaction);
export const distinct = CampTransaction.distinct.bind(CampTransaction);
export const aggregate = CampTransaction.aggregate.bind(CampTransaction);
export const bulkWrite = CampTransaction.bulkWrite.bind(CampTransaction);

export default CampTransaction;