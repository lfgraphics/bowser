import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const vehicleSchema = new Schema({
    VehicleNo: String,
    tripDetails: {
        id: { type: Schema.Types.ObjectId, ref: "TankersTrip", required: false },
        driver: { type: String, required: true },
        open: { type: Boolean, required: false },
        from: { type: String, required: false },
        to: { type: String, required: false },
        startedOn: { type: String, required: false },
        loadStatus: { type: String, required: false }
    },
    operationManager: String,
    capacity: String,
    GoodsCategory: String,
    manager: String,
    driverLogs: [{ type: Schema.Types.ObjectId, ref: "DriversLog" }]
});

vehicleSchema.virtual("lastDriverLog", {
    ref: "DriversLog",
    localField: "driverLogs",
    foreignField: "_id",
    options: { sort: { _id: -1 }, limit: 1 }
});

vehicleSchema.set("toObject", { virtuals: true });
vehicleSchema.set("toJSON", { virtuals: true });

const Vehicle = getTransportDatabaseConnection().model('Vehicle', vehicleSchema, 'VehiclesCollection');

// Export model methods as named exports
export const find = Vehicle.find.bind(Vehicle);
export const findOne = Vehicle.findOne.bind(Vehicle);
export const findById = Vehicle.findById.bind(Vehicle);
export const findOneAndUpdate = Vehicle.findOneAndUpdate.bind(Vehicle);
export const findByIdAndUpdate = Vehicle.findByIdAndUpdate.bind(Vehicle);
export const updateOne = Vehicle.updateOne.bind(Vehicle);
export const updateMany = Vehicle.updateMany.bind(Vehicle);
export const deleteOne = Vehicle.deleteOne.bind(Vehicle);
export const deleteMany = Vehicle.deleteMany.bind(Vehicle);
export const create = Vehicle.create.bind(Vehicle);
export const insertMany = Vehicle.insertMany.bind(Vehicle);
export const countDocuments = Vehicle.countDocuments.bind(Vehicle);
export const distinct = Vehicle.distinct.bind(Vehicle);
export const aggregate = Vehicle.aggregate.bind(Vehicle);
export const bulkWrite = Vehicle.bulkWrite.bind(Vehicle);

export default Vehicle;