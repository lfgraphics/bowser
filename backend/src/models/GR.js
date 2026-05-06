import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const grSchema = new Schema({
    trip: { type: Schema.Types.ObjectId, ref: 'TankersTrip' },
    GRNo: { type: String },
    digitalLockNo: { type: String },
    vehicleNo: { type: String, required: true },
    consignor: { type: String, required: true },
    consignee: { type: String, required: true },
    location: {
        loading: { type: String, required: true },
        unloading: { type: String, required: true },
    },
    loading: {
        date: { type: Date, required: true },
        qty: { type: Number, required: true },
        goods: { type: String, required: true },
        remarks: { type: String, required: false },
        driver: {
            name: { type: String, required: true },
            mobile: { type: String, required: false },
        },
        supervisor: { type: String, required: false },
        odometer: { type: Number, required: false },
    },
    dispatchParticulars: {
        calibration: {
            type: [
                {
                    chamberNo: { type: String },
                    cm: { type: Number },
                    qty: { type: Number }
                }
            ],
            required: false
        },
        totalQty: { type: Number, required: true },
        temperature: { type: Number, required: false },
        indication: { type: Number, required: false },
        strength: { type: Number, required: false },
    },
    taxInvoiceNo: { type: String, required: false },
    excisePassNo: { type: String, required: false },
    excisePassDate: { type: Date, required: false },
    unloading: {
        vM: {
            date: { type: Date, required: true },
            qty: { type: Number, required: true },
            remarks: { type: String, required: false },
            driver: {
                name: { type: String, required: true },
                mobile: { type: String, required: false },
            },
            odometer: { type: Number, required: false },
            shortage: { type: Number, required: false },
        },
        gM: {
            qty: { type: Number, required: true },
            image: { type: String, required: true },
            company: { type: String, enum: ["ITA", "INFRA", "EXPO", "ITPL"], required: true },
            shortage: { type: Number, required: false },
        },
        aM: {
            qty: { type: Number, required: true },
            shortage: { type: Number, required: false },
        }
    },
    billed: { type: Boolean, default: false },
    billingParty: { type: String, required: false },
});


const GR = getTransportDatabaseConnection().model('GR', grSchema, 'GRCollection');

// Export model methods as named exports
export const find = GR.find.bind(GR);
export const findOne = GR.findOne.bind(GR);
export const findById = GR.findById.bind(GR);
export const findOneAndUpdate = GR.findOneAndUpdate.bind(GR);
export const findByIdAndUpdate = GR.findByIdAndUpdate.bind(GR);
export const updateOne = GR.updateOne.bind(GR);
export const updateMany = GR.updateMany.bind(GR);
export const deleteOne = GR.deleteOne.bind(GR);
export const deleteMany = GR.deleteMany.bind(GR);
export const create = GR.create.bind(GR);
export const insertMany = GR.insertMany.bind(GR);
export const countDocuments = GR.countDocuments.bind(GR);
export const distinct = GR.distinct.bind(GR);
export const aggregate = GR.aggregate.bind(GR);
export const bulkWrite = GR.bulkWrite.bind(GR);

export default GR;