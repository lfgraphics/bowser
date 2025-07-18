const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');
const { getCurrentTrip } = require('../routes/transApp/utils');

const { Schema, Types } = mongoose;

const driversUpdatesSchema = new Schema({
    requestDateTime: { type: Date, default: Date.now },
    reporting: { type: String, required: true, enum: ['Loaded', 'Reported', 'Unloaded', 'Reached'] },
    driverName: { type: String, required: true },
    vehicleNo: { type: String, required: true },
    odometer: { type: Number, required: true },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            validate: {
                validator: function (v) {
                    return Array.isArray(v) &&
                        v.length === 2 &&
                        v[0] >= -180 && v[0] <= 180 &&
                        v[1] >= -90 && v[1] <= 90;
                },
                message: 'Invalid coordinates'
            }
        }
    },
    locationRemark: { type: String, default: null },
    tripId: { type: Types.ObjectId, ref: 'TankersTrip' },
    managerComment: { type: String, default: null },
    verified: { type: Boolean, default: false },
});

driversUpdatesSchema.index({ location: "2dsphere" });

driversUpdatesSchema.pre('save', async function (next) {
    if (this.isNew && !this.locationRemark) {
        try {
            const trip = await getCurrentTrip(this.vehicleNo);
            this.locationRemark = trip ? trip.EndTo : null;
            this.tripId = trip._id;
        } catch (err) {
            this.locationRemark = null;
        }
    }
    next();
});

module.exports = transportDatabaseConnection.model('DriversUpdate', driversUpdatesSchema, 'DriversUpdates');
