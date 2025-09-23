const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const externalPumpSchema = new mongoose.Schema({
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

module.exports = bowsersDatabaseConnection.model('ExternalPump', externalPumpSchema, 'ExternalPumps');