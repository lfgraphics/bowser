const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const driversLogSchema = new mongoose.Schema({
    vehicleNo: { type: String, required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },

    joining: {
        type: new mongoose.Schema({
            date: { type: Date, required: true },
            odometer: { type: Number, required: true },
            location: { type: String, required: true },
            tripId: { type: mongoose.Schema.Types.ObjectId, ref: "TankersTrip" },
            vehicleLoadStatus: { type: Number },
            remark: { type: String }
        }, { _id: false }),
        required: false
    },

    leaving: {
        type: new mongoose.Schema({
            from: { type: Date, required: true },
            tillDate: { type: Date },
            odometer: { type: Number, required: true },
            location: { type: String, required: true },
            tripId: { type: mongoose.Schema.Types.ObjectId, ref: "TankersTrip", required: true },
            vehicleLoadStatus: { type: Number, required: true },
            remark: { type: String }
        }, { _id: false }),
        required: false
    },
    creationDate: { type: Date, default: new Date() },
    statusUpdate: [{
        dateTime: { type: Date, default: Date.now, required: true },
        remark: { type: String, required: true }
    }],
});

driversLogSchema.pre("validate", function (next) {
    if (!this.joining && !this.leaving) {
        return next(new Error("Either 'joining' or 'leaving' must be provided."));
    }
    next();
});

module.exports = transportDatabaseConnection.model('DriversLog', driversLogSchema, 'DriversLog');
