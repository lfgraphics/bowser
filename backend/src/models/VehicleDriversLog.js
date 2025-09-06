const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const driversLogSchema = new mongoose.Schema({
    vehicleNo: { type: String, required: true },
    driver: { type: mongoose.Types.ObjectId, ref: "Driver" },
    joining: {
        type: {
            date: Date,
            odometer: Number,
            location: String,
            tripId: { type: mongoose.Types.ObjectId, ref: "TankersTrip" },
            vehicleLoadStatus: Number,
            remark: String
        }, required: false
    },
    leaving: {
        form: Date,
        tilldate: { type: Date, required: false },
        odometer: Number,
        location: String,
        tripId: { type: mongoose.Types.ObjectId, ref: "TankersTrip" },
        vehicleLoadStatus: Number,
        remark: String,
    },
    statusUpdate:{
        dateTime:Date,
        remark:String,
    }
});

module.exports = transportDatabaseConnection.model('DriversLog', driversLogSchema, 'DriversLog');
