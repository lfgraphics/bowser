const mongoose = require('mongoose');
const moment = require("moment-timezone");
const { bowsersDatabaseConnection } = require('../../config/database');

const fuelingOrderSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: false },
    driverId: { type: String, required: false },
    driverName: { type: String, required: true },
    driverMobile: { type: String, required: true },
    location: { type: String, required: true },
    fulfilled: { type: Boolean, default: false },
    allocation: { type: mongoose.Types.ObjectId, ref: 'FuelingOrder' },
    createdAt: { type: Date, default: () => moment().tz("Asia/Kolkata").toDate() },
});

module.exports = bowsersDatabaseConnection.model('FuelRequest', fuelingOrderSchema, 'FuelRequests');
