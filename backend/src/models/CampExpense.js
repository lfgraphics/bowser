import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const campExpensesSchema = new Schema({
    forDate: { type: Date, required: true },
    category: { enum: ['self', 'vehicle'], type: String, required: true },
    expense: {
        name: {
            enums: [
                'fuel', 'transportation', 'hotel',
                'miscellaneous', 'fooding', 'running',
                'incentive', 'maintenance', 'others'
            ],
            type: String, required: true, trim: true
        },
        description: { type: String, required: function () { return this.name === 'others'; }, trim: true },
        amount: { type: Number, required: true, min: 1 },
        approvedAmount: { type: Number, required: false, min: 1 },
        billImage: { type: String, required: false, trim: true }
    },
    vehicleNumber: { type: String, required: function () { return this.category === 'vehicle'; }, trim: true },
    driver: { type: String, required: function () { return this.category === 'vehicle'; }, trim: true },
    location: { type: String, required: false, trim: true },
    remarks: { type: String, required: false, trim: true },
    user: {
        _id: { type: Schema.Types.ObjectId, ref: 'CampUser', required: true },
        name: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
campExpensesSchema.index({ forDate: -1 });
campExpensesSchema.index({ category: 1 });
campExpensesSchema.index({ against: 1 });
campExpensesSchema.index({ vehicleNumber: 1 });
campExpensesSchema.index({ driver: 1 });
campExpensesSchema.index({ 'user._id': 1 });
campExpensesSchema.index({ 'user.name': 1 });
campExpensesSchema.index({ 'expense.name': 1 });
campExpensesSchema.index({ createdAt: -1 });
campExpensesSchema.index({ updatedAt: -1 });

// Pre-save middleware to update updatedAt
campExpensesSchema.pre('save', function (next) {
    if (!this.isNew) {
        this.updatedAt = Date.now();
    }
    next();
});

const CampExpense = getTransportDatabaseConnection().model('CampExpense', campExpensesSchema, 'CampExpenses');

// Export model methods as named exports
export const find = CampExpense.find.bind(CampExpense);
export const findOne = CampExpense.findOne.bind(CampExpense);
export const findById = CampExpense.findById.bind(CampExpense);
export const findOneAndUpdate = CampExpense.findOneAndUpdate.bind(CampExpense);
export const findByIdAndUpdate = CampExpense.findByIdAndUpdate.bind(CampExpense);
export const findByIdAndDelete = CampExpense.findByIdAndDelete.bind(CampExpense);
export const findOneAndDelete = CampExpense.findOneAndDelete.bind(CampExpense);
export const updateOne = CampExpense.updateOne.bind(CampExpense);
export const updateMany = CampExpense.updateMany.bind(CampExpense);
export const deleteOne = CampExpense.deleteOne.bind(CampExpense);
export const deleteMany = CampExpense.deleteMany.bind(CampExpense);
export const create = CampExpense.create.bind(CampExpense);
export const insertMany = CampExpense.insertMany.bind(CampExpense);
export const countDocuments = CampExpense.countDocuments.bind(CampExpense);
export const distinct = CampExpense.distinct.bind(CampExpense);
export const aggregate = CampExpense.aggregate.bind(CampExpense);
export const bulkWrite = CampExpense.bulkWrite.bind(CampExpense);

export default CampExpense;