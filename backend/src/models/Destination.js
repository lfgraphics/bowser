import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const destinationSchema = new Schema({
    title: { type: String, required: true },
    displayTitle: { type: String, required: false },

    location: [
        { type: Schema.Types.ObjectId, ref: "Location", required: true }
    ],

    isPump: { type: Boolean, required: true, default: false },
    isServiceProvider: { type: Boolean, required: true, default: false },
    isConsignee: { type: Boolean, required: true, default: false },
    isConsigner: { type: Boolean, required: true, default: false },
    isOpen: { type: Boolean, required: true, default: false },

    dealer: { type: Schema.Types.ObjectId, ref: "GlobalCompany", required: false },
    contactInfo: [
        { type: Schema.Types.ObjectId, ref: "ContactInfo", required: false }
    ]
});

destinationSchema.index({ displayTitle: 1 });
destinationSchema.index({ title: 1 });
destinationSchema.index({ isOpen: 1 });
destinationSchema.index({ isConsignee: 1 });
destinationSchema.index({ isConsigner: 1 });
destinationSchema.index({ isServiceProvider: 1 });

const Destination = getTransportDatabaseConnection().model('Destination', destinationSchema, 'DestinationsCollection');

// Export model methods as named exports
export const find = Destination.find.bind(Destination);
export const findOne = Destination.findOne.bind(Destination);
export const findById = Destination.findById.bind(Destination);
export const findOneAndUpdate = Destination.findOneAndUpdate.bind(Destination);
export const findByIdAndUpdate = Destination.findByIdAndUpdate.bind(Destination);
export const updateOne = Destination.updateOne.bind(Destination);
export const updateMany = Destination.updateMany.bind(Destination);
export const deleteOne = Destination.deleteOne.bind(Destination);
export const deleteMany = Destination.deleteMany.bind(Destination);
export const create = Destination.create.bind(Destination);
export const insertMany = Destination.insertMany.bind(Destination);
export const countDocuments = Destination.countDocuments.bind(Destination);
export const distinct = Destination.distinct.bind(Destination);
export const aggregate = Destination.aggregate.bind(Destination);
export const bulkWrite = Destination.bulkWrite.bind(Destination);

export default Destination;