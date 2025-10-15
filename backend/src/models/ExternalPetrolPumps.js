import { Schema } from 'mongoose';
import { getBowsersDatabaseConnection } from '../../config/database.js';

const externalPumpSchema = new Schema({
    company: { type: String, required: true },
    branches: [
        {
            name: { type: String, required: true },
            state: { type: String },
            city: { type: String },
            district: { type: String },
            address: { type: String },
            type: { type: String },
            alias: { type: String },
        }
    ]
}, { timestamps: true });

export default getBowsersDatabaseConnection().model('ExternalPump', externalPumpSchema, 'ExternalPumps');