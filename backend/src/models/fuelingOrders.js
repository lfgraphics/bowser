const mongoose = require('mongoose');
const { bowsersDatabaseConnection } = require('../../config/database');

const fuelingOrderSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true },
  driverId: { type: String, required: true },
  driverName: { type: String, required: true },
  driverMobile: { type: String },
  quantityType: {
    type: String,
    enum: ['Full', 'Part'],
    required: true
  },
  fuelQuantity: { type: Number, required: true },
  bowserDriver: {
    _id: mongoose.Schema.Types.ObjectId,
    userName: { type: String, },
    userId: { type: String, required: true }
  },
  allocationAdmin: {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    userName: { type: String, required: true },
    userId: { type: String, required: true },
    location: { type: String},
  },
  createdAt: { type: String, default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
});

// Validate the quantityType
fuelingOrderSchema.methods.validateQuantityType = function () {
  return ['Full', 'Part'].includes(this.quantityType);
};

module.exports = bowsersDatabaseConnection.model('FuelingOrder', fuelingOrderSchema, 'FuelingOrdersCollection');
