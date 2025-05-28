const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const fuelStationSchema = new mongoose.Schema({
    name: { type: String, required: true },
})

module.exports = bowsersDatabaseConnection.model('FuelStation', fuelStationSchema, 'FuelStations');
