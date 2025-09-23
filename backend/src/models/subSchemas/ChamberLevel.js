const mongoose = require('mongoose');

const chamberLevelSchema = new mongoose.Schema({
    levelNo: { type: Number, required: true },
    levelHeight: { type: Number, required: true },
    levelAdditionQty: { type: Number, required: true },
    levelTotalQty: { type: Number },           // Auto-calculated
    levelCalibrationQty: { type: Number },     // Auto-calculated
}, { _id: false });

module.exports = chamberLevelSchema;