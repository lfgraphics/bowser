const mongoose = require('mongoose');

const dispensesSchema = new mongoose.Schema({
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'FuelingTransaction' },
    fuelQuantity: { type: Number, required: true },
    isVerified: { type: Boolean, default: false },
    isPosted: { type: Boolean, default: false }
}, { _id: false });

module.exports = dispensesSchema;