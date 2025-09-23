const mongoose = require('mongoose');
const chamberLevelSchema = require('./ChamberLevel')

const chamberSchema = new mongoose.Schema({
    chamberId: { type: String, required: true },
    levels: [chamberLevelSchema]
}, { _id: false });

module.exports = chamberSchema