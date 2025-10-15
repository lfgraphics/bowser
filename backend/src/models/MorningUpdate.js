import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const morningUpdateSchema = new Schema({
    user: {
        _id: { type: Schema.Types.ObjectId, ref: 'TransAppUser', required: true },
        name: { type: String, required: true },
    },
    openingTime: { type: Date, required: true },
    report: [
        {
            vehicleNo: { type: String, required: true },
            remark: { type: String },
            location: { type: String, required: true },
            trip: { type: Schema.Types.ObjectId, ref: 'TankersTrip' },
            driver: { type: Schema.Types.ObjectId, ref: 'Driver' },
        }
    ],
    activityLogs: {
        type: [
            {
                timestamp: { type: Date, required: true },
                type: { type: String, required: true },
                details: { type: Schema.Types.Mixed }
            }
        ],
        default: [],
    },
    closingTime: { type: Date, required: true, default: Date.now, timezone: "Asia/Kolkata" }
});

const MorningUpdate = getTransportDatabaseConnection().model('MorningUpdate', morningUpdateSchema, 'MorningUpdates');

// Export model methods as named exports
export const find = MorningUpdate.find.bind(MorningUpdate);
export const findOne = MorningUpdate.findOne.bind(MorningUpdate);
export const findById = MorningUpdate.findById.bind(MorningUpdate);
export const findOneAndUpdate = MorningUpdate.findOneAndUpdate.bind(MorningUpdate);
export const findByIdAndUpdate = MorningUpdate.findByIdAndUpdate.bind(MorningUpdate);
export const updateOne = MorningUpdate.updateOne.bind(MorningUpdate);
export const updateMany = MorningUpdate.updateMany.bind(MorningUpdate);
export const deleteOne = MorningUpdate.deleteOne.bind(MorningUpdate);
export const deleteMany = MorningUpdate.deleteMany.bind(MorningUpdate);
export const create = MorningUpdate.create.bind(MorningUpdate);
export const insertMany = MorningUpdate.insertMany.bind(MorningUpdate);
export const countDocuments = MorningUpdate.countDocuments.bind(MorningUpdate);
export const distinct = MorningUpdate.distinct.bind(MorningUpdate);
export const aggregate = MorningUpdate.aggregate.bind(MorningUpdate);
export const bulkWrite = MorningUpdate.bulkWrite.bind(MorningUpdate);

export default MorningUpdate;
