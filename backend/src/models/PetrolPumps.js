const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const petrolPumpSchema = new mongoose.Schema({
    name: { type: String, required: true },
    state: { type: String, required: false },
}, { timestamps: true });

module.exports = bowsersDatabaseConnection.model('PetrolPump', petrolPumpSchema, 'PetrolPumps');