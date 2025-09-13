const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const vehicleSchema = new mongoose.Schema({
    VehicleNo: String,
    tripDetails: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "TankersTrip", required: false },
        driver: { type: String, required: true },
        open: { type: Boolean, required: false },
        from: { type: String, required: false },
        to: { type: String, required: false },
        startedOn: { type: String, required: false },
        loadStatus: { type: String, required: false }
    },
    operationManager: String,
    capacity: String,
    GoodsCategory: String,
    manager: String,
    driverLogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "DriversLog" }]
});

vehicleSchema.virtual("lastDriverLog", {
    ref: "DriversLog",
    localField: "driverLogs",
    foreignField: "_id",
    options: { sort: { _id: -1 }, limit: 1 }
});

vehicleSchema.set("toObject", { virtuals: true });
vehicleSchema.set("toJSON", { virtuals: true });

module.exports = transportDatabaseConnection.model('Vehicle', vehicleSchema, 'VehiclesCollection');