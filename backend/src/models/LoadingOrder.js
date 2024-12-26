const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const loadingOrderSchema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
    regNo: { type: String, require: true, ref:'Bowser' },
    loadingDesc: { type: String, require: false },
    bccAuthorizedOfficer: {
        id: { type: String, required: true },
        name: { type: String, required: true }
    },
    fulfilled: { type: Boolean, default: false }
})

module.exports = bowsersDatabaseConnection.model('LoadingOrder', loadingOrderSchema, 'BowserLoadingOrders');
