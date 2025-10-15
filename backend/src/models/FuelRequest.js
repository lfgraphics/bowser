import { Schema, Types } from 'mongoose';
import moment from "moment-timezone";
import './fuelingOrders.js';
import { getBowsersDatabaseConnection } from '../../config/database.js';

const fuelRequestSchema = new Schema({
    vehicleNumber: { type: String, required: true },
    capacity: { type: String, required: false },
    odometer: { type: String, required: false },
    tripStatus: String,
    loadStatus: String,
    trip: String,
    startDate: Date,
    manager: [String],
    driverId: { type: String, required: false },
    driverName: { type: String, required: true },
    driverMobile: { type: String, required: true },
    location: { type: String, required: true },
    fulfilled: { type: Boolean, default: false },
    message: { type: String, required: false },
    tripId: { type: String, required: false },
    seen: { type: Boolean, default: false },
    allocation: { type: Types.ObjectId, ref: 'FuelingOrder' },
    createdAt: { type: Date, default: () => moment().tz("Asia/Kolkata").toDate() },
});

const FuelRequest = getBowsersDatabaseConnection().model('FuelRequest', fuelRequestSchema, 'FuelRequests');

// Export model methods as named exports
export const find = FuelRequest.find.bind(FuelRequest);
export const findOne = FuelRequest.findOne.bind(FuelRequest);
export const findById = FuelRequest.findById.bind(FuelRequest);
export const findOneAndUpdate = FuelRequest.findOneAndUpdate.bind(FuelRequest);
export const findByIdAndUpdate = FuelRequest.findByIdAndUpdate.bind(FuelRequest);
export const updateOne = FuelRequest.updateOne.bind(FuelRequest);
export const updateMany = FuelRequest.updateMany.bind(FuelRequest);
export const deleteOne = FuelRequest.deleteOne.bind(FuelRequest);
export const deleteMany = FuelRequest.deleteMany.bind(FuelRequest);
export const create = FuelRequest.create.bind(FuelRequest);
export const insertMany = FuelRequest.insertMany.bind(FuelRequest);
export const countDocuments = FuelRequest.countDocuments.bind(FuelRequest);
export const distinct = FuelRequest.distinct.bind(FuelRequest);
export const aggregate = FuelRequest.aggregate.bind(FuelRequest);
export const bulkWrite = FuelRequest.bulkWrite.bind(FuelRequest);

export default FuelRequest;
