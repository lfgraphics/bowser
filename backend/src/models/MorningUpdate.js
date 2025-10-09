const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const morningUpdateSchema = new mongoose.Schema({
    user: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'TransAppUser', required: true },
        name: { type: String, required: true },
    },
    openingTime: { type: Date, required: true },
    report: [
        {
            vehicleNo: { type: String, required: true },
            remark: { type: String },
            location: { type: String, required: true },
            trip: { type: mongoose.Schema.Types.ObjectId, ref: 'TankersTrip' },
            driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
        }
    ],
    activityLogs: {
        type: [
            {
                timestamp: { type: Date, required: true },
                type: { type: String, required: true },
                details: { type: mongoose.Schema.Types.Mixed }
            }
        ],
        default: [],
    },
    closingTime: { type: Date, required: true, default: Date.now, timezone: "Asia/Kolkata" }
});

module.exports = transportDatabaseConnection.model('MorningUpdate', morningUpdateSchema, 'MorningUpdates');
