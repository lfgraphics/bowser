import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const driversLogSchema = new Schema({
    vehicleNo: { type: String, required: true },
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },

    joining: {
        type: new Schema({
            date: { type: Date, required: true },
            odometer: { type: Number, required: true },
            location: { type: String, required: true },
            tripId: { type: Schema.Types.ObjectId, ref: "TankersTrip" },
            vehicleLoadStatus: { type: Number },
            remark: { type: String }
        }, { _id: false }),
        required: false
    },

    leaving: {
        type: new Schema({
            from: { type: Date, required: true },
            tillDate: { type: Date },
            odometer: { type: Number, required: true },
            location: { type: String, required: true },
            tripId: { type: Schema.Types.ObjectId, ref: "TankersTrip", required: true },
            vehicleLoadStatus: { type: Number, required: true },
            remark: { type: String }
        }, { _id: false }),
        required: false
    },
    creationDate: { type: Date, default: Date.now },
    statusUpdate: [{
        dateTime: { type: Date, default: Date.now, required: true },
        remark: { type: String, required: true }
    }],
});

// Add indexes for better query performance and reduced conflicts
driversLogSchema.index({ vehicleNo: 1, creationDate: -1 }); // Primary queries
driversLogSchema.index({ driver: 1 }); // Driver lookups
driversLogSchema.index({ vehicleNo: 1, driver: 1 }, { unique: true, sparse: true }); // Unique constraint per vehicle-driver combo

driversLogSchema.pre("validate", function (next) {
    if (!this.joining && !this.leaving) {
        return next(new Error("Either 'joining' or 'leaving' must be provided."));
    }
    next();
});

const DriversLog = getTransportDatabaseConnection().model('DriversLog', driversLogSchema, 'DriversLog');

// Export model methods as named exports
export const find = DriversLog.find.bind(DriversLog);
export const findOne = DriversLog.findOne.bind(DriversLog);
export const findById = DriversLog.findById.bind(DriversLog);
export const findOneAndUpdate = DriversLog.findOneAndUpdate.bind(DriversLog);
export const findByIdAndUpdate = DriversLog.findByIdAndUpdate.bind(DriversLog);
export const updateOne = DriversLog.updateOne.bind(DriversLog);
export const updateMany = DriversLog.updateMany.bind(DriversLog);
export const deleteOne = DriversLog.deleteOne.bind(DriversLog);
export const deleteMany = DriversLog.deleteMany.bind(DriversLog);
export const create = DriversLog.create.bind(DriversLog);
export const insertMany = DriversLog.insertMany.bind(DriversLog);
export const countDocuments = DriversLog.countDocuments.bind(DriversLog);
export const distinct = DriversLog.distinct.bind(DriversLog);
export const aggregate = DriversLog.aggregate.bind(DriversLog);
export const bulkWrite = DriversLog.bulkWrite.bind(DriversLog);

export default DriversLog;
