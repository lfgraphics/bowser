import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const loadingOrderNotificationSchema = new Schema({
    to: { type: String, required: true },
    type: { type: String, enum: ['new', 'divert'], required: true, default: 'new' },
    sentAt: { type: Date, default: Date.now },
    tripId: { type: Schema.Types.ObjectId, ref: 'TankersTrip', required: true },
    destinationId: { type: Schema.Types.ObjectId, ref: 'StackHolder', required: true },
    destinationName: { type: String, required: true },
    location: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    from: { type: String, required: true },
    vehicle: { type: String },
}, {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

loadingOrderNotificationSchema.virtual('url').get(function () {
    return String(`/trans-app/${this.type === "new" ? 'loading-planner?' : 'loading-tracker?actionType=destinationChange'}${this.type === "new" ? '' : '&'}tripId=${this.tripId}&destination=${this.destinationId}&destinationName=${this.destinationName}&orderedBy=${this.from}&notificationId=${this._id}`);
});

const LoadingOrderNotification = getTransportDatabaseConnection().model('LoadingOrderNotification', loadingOrderNotificationSchema, 'LoadingOrderNotifications');

// Export model methods as named exports
export const find = LoadingOrderNotification.find.bind(LoadingOrderNotification);
export const findOne = LoadingOrderNotification.findOne.bind(LoadingOrderNotification);
export const findById = LoadingOrderNotification.findById.bind(LoadingOrderNotification);
export const findOneAndUpdate = LoadingOrderNotification.findOneAndUpdate.bind(LoadingOrderNotification);
export const findByIdAndUpdate = LoadingOrderNotification.findByIdAndUpdate.bind(LoadingOrderNotification);
export const findByIdAndDelete = LoadingOrderNotification.findByIdAndDelete.bind(LoadingOrderNotification);
export const updateOne = LoadingOrderNotification.updateOne.bind(LoadingOrderNotification);
export const updateMany = LoadingOrderNotification.updateMany.bind(LoadingOrderNotification);
export const deleteOne = LoadingOrderNotification.deleteOne.bind(LoadingOrderNotification);
export const deleteMany = LoadingOrderNotification.deleteMany.bind(LoadingOrderNotification);
export const create = LoadingOrderNotification.create.bind(LoadingOrderNotification);
export const insertMany = LoadingOrderNotification.insertMany.bind(LoadingOrderNotification);
export const countDocuments = LoadingOrderNotification.countDocuments.bind(LoadingOrderNotification);
export const distinct = LoadingOrderNotification.distinct.bind(LoadingOrderNotification);
export const aggregate = LoadingOrderNotification.aggregate.bind(LoadingOrderNotification);
export const bulkWrite = LoadingOrderNotification.bulkWrite.bind(LoadingOrderNotification);

export default LoadingOrderNotification;
