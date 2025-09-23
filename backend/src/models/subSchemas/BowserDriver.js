const mongoose = require('mongoose');

const bowserDriverSchema = new mongoose.Schema({
    handOverDate: { type: Date, required: false },
    name: { type: String, required: true },
    phoneNo: { type: String, required: true }
}, { _id: false });

module.exports = bowserDriverSchema