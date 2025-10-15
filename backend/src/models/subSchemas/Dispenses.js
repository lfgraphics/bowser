import { Schema } from 'mongoose';

const dispensesSchema = new Schema({
    transaction: { type: Schema.Types.ObjectId, ref: 'FuelingTransaction' },
    fuelQuantity: { type: Number },
    isVerified: { type: Boolean, default: false },
    isPosted: { type: Boolean, default: false }
}, { _id: false });

export default dispensesSchema;