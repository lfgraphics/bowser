const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../../config/database');

const cancellationSchema = new mongoose.Schema({
    by: { type: String, required: true },
    reason: { type: String, default: "Back to work" },
    time: { type: Date, required: false },
}, { _id: false });

const requestTransferSchema = new mongoose.Schema({
    by: { type: String, required: true },
    to: { type: String, required: true },
    transferReason: { type: String, required: true },
    accepted: { type: Boolean, default: false },
    fulfilled: { type: Boolean, default: false },
    cancellation: { type: cancellationSchema, required: false },
    generationTime: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

requestTransferSchema.pre('save', function (next) {
    if (this.cancellation?.by && !this.cancellation.time) {
        this.cancellation.time = new Date();
    }
    next();
});

module.exports = UsersAndRolesDatabaseConnection.model('RequestTransfer', requestTransferSchema, 'RequestTransfer');
