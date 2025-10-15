import { Schema } from 'mongoose';
import { getBowsersDatabaseConnection } from '../../config/database.js';

const loadingOrderSchema = new Schema({
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
    tripSheetId: { type: Schema.Types.ObjectId, ref: "TripSheet", required: false },
    regNo: { type: String, require: true, ref: 'Bowser' },
    loadingDesc: { type: String, require: false },
    product: { type: String, require: false },
    loadingLocationName: { type: String, require: false },
    loadingLocation: { type: String, require: true },
    bccAuthorizedOfficer: {
        id: { type: String, required: true },
        name: { type: String, required: true }
    },
    fulfilled: { type: Boolean, default: false }
})

const LoadingOrder = getBowsersDatabaseConnection().model('LoadingOrder', loadingOrderSchema, 'BowserLoadingOrders');

// Export model methods as named exports
export const find = LoadingOrder.find.bind(LoadingOrder);
export const findOne = LoadingOrder.findOne.bind(LoadingOrder);
export const findById = LoadingOrder.findById.bind(LoadingOrder);
export const findOneAndUpdate = LoadingOrder.findOneAndUpdate.bind(LoadingOrder);
export const findByIdAndUpdate = LoadingOrder.findByIdAndUpdate.bind(LoadingOrder);
export const findByIdAndDelete = LoadingOrder.findByIdAndDelete.bind(LoadingOrder);
export const updateOne = LoadingOrder.updateOne.bind(LoadingOrder);
export const updateMany = LoadingOrder.updateMany.bind(LoadingOrder);
export const deleteOne = LoadingOrder.deleteOne.bind(LoadingOrder);
export const deleteMany = LoadingOrder.deleteMany.bind(LoadingOrder);
export const create = LoadingOrder.create.bind(LoadingOrder);
export const insertMany = LoadingOrder.insertMany.bind(LoadingOrder);
export const countDocuments = LoadingOrder.countDocuments.bind(LoadingOrder);
export const distinct = LoadingOrder.distinct.bind(LoadingOrder);
export const aggregate = LoadingOrder.aggregate.bind(LoadingOrder);
export const bulkWrite = LoadingOrder.bulkWrite.bind(LoadingOrder);

export default LoadingOrder;
