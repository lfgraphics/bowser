const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const loadingOrderSchema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
    tripSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "TripSheet", required: false },
    regNo: { type: String, require: true, ref: 'Bowser' },
    loadingDesc: { type: String, require: false },
    product: { type: String, require: false },
    loadingLocation: { type: String, require: true },
    bccAuthorizedOfficer: {
        id: { type: String, required: true },
        name: { type: String, required: true }
    },
    fulfilled: { type: Boolean, default: false }
})

module.exports = bowsersDatabaseConnection.model('LoadingOrder', loadingOrderSchema, 'BowserLoadingOrders');
