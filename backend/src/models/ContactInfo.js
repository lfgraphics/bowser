import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const contactInfoSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: false },
    phone: { type: String, required: false },
    address: { type: String, required: false },
    dealer: { type: Schema.Types.ObjectId, ref: "Destination", required: false },
    designation: { type: String, required: false },
});

contactInfoSchema.index({ name: 1 });
contactInfoSchema.index({ email: 1 });
contactInfoSchema.index({ phone: 1 });
contactInfoSchema.index({ dealer: 1 });

const ContactInfo = getTransportDatabaseConnection().model('ContactInfo', contactInfoSchema, 'ContactInfosCollection');

// Export model methods as named exports
export const find = ContactInfo.find.bind(ContactInfo);
export const findOne = ContactInfo.findOne.bind(ContactInfo);
export const findById = ContactInfo.findById.bind(ContactInfo);
export const findOneAndUpdate = ContactInfo.findOneAndUpdate.bind(ContactInfo);
export const findByIdAndUpdate = ContactInfo.findByIdAndUpdate.bind(ContactInfo);
export const updateOne = ContactInfo.updateOne.bind(ContactInfo);
export const updateMany = ContactInfo.updateMany.bind(ContactInfo);
export const deleteOne = ContactInfo.deleteOne.bind(ContactInfo);
export const deleteMany = ContactInfo.deleteMany.bind(ContactInfo);
export const create = ContactInfo.create.bind(ContactInfo);
export const insertMany = ContactInfo.insertMany.bind(ContactInfo);
export const countDocuments = ContactInfo.countDocuments.bind(ContactInfo);
export const distinct = ContactInfo.distinct.bind(ContactInfo);
export const aggregate = ContactInfo.aggregate.bind(ContactInfo);
export const bulkWrite = ContactInfo.bulkWrite.bind(ContactInfo);

export default ContactInfo;