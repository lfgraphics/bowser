const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const tankerTripSchema = new mongoose.Schema({
    VehicleNo: {type: String, required: true},
    tallyTripId: String,
    TravelHistory: [{
        TrackUpdateDate: { type: Date },
        LocationOnTrackUpdate: { type: String },
        OdometerOnTrackUpdate: { type: String },
        ManagerComment: { type: String },
        Driver: { type: String },
    }, { _id: false }],
    fuelingHistory: [{
        request: { type: mongoose.Types.ObjectId, ref: 'FuelRequest' },
        allocation: { type: mongoose.Types.ObjectId, ref: 'FuelingOrder' },
        dateTime: { type: Date },
        location: { type: String },
        odometer: { type: String },
        fueling: {
            quantity: { type: Number },
            type: { type: String, enum: ['Full', 'Part'] },
            id: { type: mongoose.Types.ObjectId, ref: 'FuelingTransaction' },
        }
    }, { _id: false }],
});

module.exports = transportDatabaseConnection.model('TankersTrip', tankerTripSchema, 'TankersTrips');
