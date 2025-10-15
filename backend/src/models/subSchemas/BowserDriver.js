import { Schema } from 'mongoose';

const bowserDriverSchema = new Schema({
    handOverDate: { type: Date, required: false },
    name: { type: String, required: true },
    phoneNo: { type: String, required: true }
}, { _id: false });

export default bowserDriverSchema