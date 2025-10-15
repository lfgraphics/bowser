import { Schema } from 'mongoose';
import chamberLevelSchema from './ChamberLevel.js';

const chamberSchema = new Schema({
    chamberId: { type: String, required: true },
    levels: [chamberLevelSchema]
}, { _id: false });

export default chamberSchema