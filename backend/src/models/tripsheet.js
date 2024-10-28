const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const bowserSchema = new mongoose.Schema({
    VehicleNo: {
        type: String,
        required: true,
        unique: true
    },
    chessisNo: {
        type: String,
        required: true,
        unique: true
    },
    totalCapacity: number
});

module.exports = bowsersDatabaseConnection.model('Bowser', bowserSchema, 'BowsersCollection');