import { Schema } from 'mongoose';

const dispenseSchema = new Schema({
    transaction: { type: Schema.Types.ObjectId, ref: 'FuelingTransaction' },
    fuelQuantity: { type: Number, required: true },
    isVerified: { type: Boolean, default: false },
    isPosted: { type: Boolean, default: false },
}, { _id: false });

export default dispenseSchema;