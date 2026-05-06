import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const haltageSchema = new Schema({
    vehicleNo: { type: String, required: true },

    reason: { type: String, enum: ["Fueling", "Loading", "Unloading", "Maintenance", "Breakdown", "Toll", "Parking", "Other"], required: false },

    arrivalTime: Date,
    arrivalDriver: String,
    arrivalOdometer: Number,

    departureTime: Date,
    departureDriver: String,
    departureOdometer: Number,
});

haltageSchema.index({ departureTime: 1 });
haltageSchema.index({ arrivalTime: 1 });
haltageSchema.index({ vehicleNo: 1 });
haltageSchema.index({ reason: 1 });

haltageSchema.virtual('duration').get(function () {
    if (this.arrivalTime && this.departureTime) {
        const diff = this.departureTime.getTime() - this.arrivalTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }
    return null;
});

const Haltage = getTransportDatabaseConnection().model('Haltage', haltageSchema, 'HaltagesCollection');

// Export model methods as named exports
export const find = Haltage.find.bind(Haltage);
export const findOne = Haltage.findOne.bind(Haltage);
export const findById = Haltage.findById.bind(Haltage);
export const findOneAndUpdate = Haltage.findOneAndUpdate.bind(Haltage);
export const findByIdAndUpdate = Haltage.findByIdAndUpdate.bind(Haltage);
export const updateOne = Haltage.updateOne.bind(Haltage);
export const updateMany = Haltage.updateMany.bind(Haltage);
export const deleteOne = Haltage.deleteOne.bind(Haltage);
export const deleteMany = Haltage.deleteMany.bind(Haltage);
export const create = Haltage.create.bind(Haltage);
export const insertMany = Haltage.insertMany.bind(Haltage);
export const countDocuments = Haltage.countDocuments.bind(Haltage);
export const distinct = Haltage.distinct.bind(Haltage);
export const aggregate = Haltage.aggregate.bind(Haltage);
export const bulkWrite = Haltage.bulkWrite.bind(Haltage);

export default Haltage;