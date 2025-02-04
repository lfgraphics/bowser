const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const saleryCalcSchema = new mongoose.Schema({
    foodingRate: { type: Number, required: true },
    saleryRate: { type: Number, required: true },
    rewardRate: { type: Number, required: true }
});

module.exports = bowsersDatabaseConnection.model('SaleryCalc', saleryCalcSchema, 'CountersCollection');