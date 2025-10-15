import { Schema } from 'mongoose';
import { getBowsersDatabaseConnection } from '../../config/database.js';

const loadingSheetSchema = new Schema({
    regNo: { type: String, required: true }, // taken from the loading order
    odoMeter: { type: Number, required: true },
    tripSheetId: { type: Schema.Types.ObjectId, ref: "TripSheet" },
    fuleingMachine: { type: String, required: true },
    pumpReadingBefore: { type: Number, required: false },
    pumpReadingAfter: { type: Number, required: true },
    product: { type: String },
    changeInOpeningDip: {
        type: {
            reason: { type: String, required: true },
            remarks: { type: String, required: false },
        }, required: false
    },
    chamberwiseDipListBefore: {
        type: [
            {
                chamberId: { type: String },
                levelHeight: { type: Number },
                qty: { type: Number } // auto calculated according to the bowser's chamber calibration in the .pre() hook below
            }
        ],
        _id: false
    },
    chamberwiseDipListAfter: {
        type: [
            {
                chamberId: { type: String },
                levelHeight: { type: Number },
                qty: { type: Number } // auto calculated according to the bowser's chamber calibration in the .pre() hook below
            }
        ],
        _id: false
    },
    chamberwiseSealList: {
        type: [
            {
                chamberId: { type: String },
                sealId: { type: String },
                sealPhoto: { type: String }
            }
        ],
        _id: false
    },
    loadingSlips: {
        type: [
            {
                qty: { type: Number, required: true },
                slipPhoto: { type: String, required: false },
            }
        ],
        _id: false
    },
    totalLoadQuantityBySlip: { type: Number },
    totalLoadQuantityByDip: { type: Number },
    tempLoadByDip: { type: Number },
    loadingIncharge: {
        id: { type: String, required: true },
        name: { type: String, required: true }
    },
    bccAuthorizedOfficer: {  // taken from the loading order
        orderId: { type: Schema.Types.ObjectId, ref: 'LoadingOrder' },
        id: { type: String, required: true },
        name: { type: String, required: true }
    },
    fulfilled: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

const LoadingSheet = getBowsersDatabaseConnection().model('LoadingSheet', loadingSheetSchema, 'BowserLoadingSheets');

// Export model methods as named exports
export const find = LoadingSheet.find.bind(LoadingSheet);
export const findOne = LoadingSheet.findOne.bind(LoadingSheet);
export const findById = LoadingSheet.findById.bind(LoadingSheet);
export const findOneAndUpdate = LoadingSheet.findOneAndUpdate.bind(LoadingSheet);
export const findByIdAndUpdate = LoadingSheet.findByIdAndUpdate.bind(LoadingSheet);
export const findByIdAndDelete = LoadingSheet.findByIdAndDelete.bind(LoadingSheet);
export const updateOne = LoadingSheet.updateOne.bind(LoadingSheet);
export const updateMany = LoadingSheet.updateMany.bind(LoadingSheet);
export const deleteOne = LoadingSheet.deleteOne.bind(LoadingSheet);
export const deleteMany = LoadingSheet.deleteMany.bind(LoadingSheet);
export const create = LoadingSheet.create.bind(LoadingSheet);
export const insertMany = LoadingSheet.insertMany.bind(LoadingSheet);
export const countDocuments = LoadingSheet.countDocuments.bind(LoadingSheet);
export const distinct = LoadingSheet.distinct.bind(LoadingSheet);
export const aggregate = LoadingSheet.aggregate.bind(LoadingSheet);
export const bulkWrite = LoadingSheet.bulkWrite.bind(LoadingSheet);

export default LoadingSheet;
