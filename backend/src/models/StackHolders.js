const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const stackHoldersSchema = new mongoose.Schema({
    InstitutionName: String,
    IsBillingParty: { type: Boolean, default: true },
    IsConsignee: { type: Boolean, default: true },
    IsConsigner: { type: Boolean, default: true },
    Location: String,
}, { versionKey: false });

module.exports = transportDatabaseConnection.model('StackHolder', stackHoldersSchema, 'StackHolders');
