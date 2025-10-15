import { Schema } from 'mongoose';
import { getBowsersDatabaseConnection } from '../../config/database.js';
import chamberSchema from './subSchemas/Chamber.js';
import { calculateChamberLevels } from '../utils/calibration.js';

const bowserSchema = new Schema({
    regNo: { type: String, require: true, unique: true },
    currentTrip: {
        type: Schema.Types.ObjectId,
        ref: 'TripSheet'
    },
    chambers: [chamberSchema],
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

bowserSchema.pre('save', function (next) {
    try {
        this.chambers = calculateChamberLevels(this.chambers);
        next();
    } catch (error) {
        console.error('Error in Bowser pre-save hook:', error);
        next(error);
    }
});

const Bowser = getBowsersDatabaseConnection().model('Bowser', bowserSchema, 'BowsersCollection');

// Export model methods as named exports
export const find = Bowser.find.bind(Bowser);
export const findOne = Bowser.findOne.bind(Bowser);
export const findById = Bowser.findById.bind(Bowser);
export const findOneAndUpdate = Bowser.findOneAndUpdate.bind(Bowser);
export const findByIdAndUpdate = Bowser.findByIdAndUpdate.bind(Bowser);
export const findByIdAndDelete = Bowser.findByIdAndDelete.bind(Bowser);
export const updateOne = Bowser.updateOne.bind(Bowser);
export const updateMany = Bowser.updateMany.bind(Bowser);
export const deleteOne = Bowser.deleteOne.bind(Bowser);
export const deleteMany = Bowser.deleteMany.bind(Bowser);
export const create = Bowser.create.bind(Bowser);
export const insertMany = Bowser.insertMany.bind(Bowser);
export const countDocuments = Bowser.countDocuments.bind(Bowser);
export const distinct = Bowser.distinct.bind(Bowser);
export const aggregate = Bowser.aggregate.bind(Bowser);
export const bulkWrite = Bowser.bulkWrite.bind(Bowser);

export default Bowser;
