const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const GoodsSchema = new mongoose.Schema({
    GoodsName: String,
    Division: Number,
}, { versionKey: false });

module.exports = transportDatabaseConnection.model('Goods', GoodsSchema, 'TransportGoods');
