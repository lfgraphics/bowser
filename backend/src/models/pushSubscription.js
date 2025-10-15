import { Schema } from 'mongoose';
import { getUsersAndRolesDatabaseConnection } from '../../config/database.js';
// const moment = require("moment-timezone");

const pushSubscriptionSchema = new Schema({
    mobileNumber: { type: String, required: false },
    userId: { type: String, required: false },
    groups: [{ type: String, required: false }],
    subscription: { type: Object, required: true },
    platform: { type: String, default: 'web' },
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

const PushSubscription = getUsersAndRolesDatabaseConnection().model('PushSubscription', pushSubscriptionSchema, 'PushSubscriptionsCollection');

// Export model methods as named exports
export const find = PushSubscription.find.bind(PushSubscription);
export const findOne = PushSubscription.findOne.bind(PushSubscription);
export const findById = PushSubscription.findById.bind(PushSubscription);
export const findOneAndUpdate = PushSubscription.findOneAndUpdate.bind(PushSubscription);
export const findByIdAndUpdate = PushSubscription.findByIdAndUpdate.bind(PushSubscription);
export const findByIdAndDelete = PushSubscription.findByIdAndDelete.bind(PushSubscription);
export const updateOne = PushSubscription.updateOne.bind(PushSubscription);
export const updateMany = PushSubscription.updateMany.bind(PushSubscription);
export const deleteOne = PushSubscription.deleteOne.bind(PushSubscription);
export const deleteMany = PushSubscription.deleteMany.bind(PushSubscription);
export const create = PushSubscription.create.bind(PushSubscription);
export const insertMany = PushSubscription.insertMany.bind(PushSubscription);
export const countDocuments = PushSubscription.countDocuments.bind(PushSubscription);
export const distinct = PushSubscription.distinct.bind(PushSubscription);
export const aggregate = PushSubscription.aggregate.bind(PushSubscription);
export const bulkWrite = PushSubscription.bulkWrite.bind(PushSubscription);

export default PushSubscription;