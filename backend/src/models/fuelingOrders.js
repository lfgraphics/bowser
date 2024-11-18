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
  bowser: {
    regNo: { type: String, },
    driver: {
      name: { type: String, },
      id: { type: String, required: true },
      phoneNo: { type: String, },
    }
  },
  allocationAdmin: {
    name: { type: String, required: true },
    id: { type: String, required: true },
  },
  createdAt: { type: String, default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
});

// Validate the quantityType
fuelingOrderSchema.methods.validateQuantityType = function () {
  return ['Full', 'Part'].includes(this.quantityType);
};

module.exports = bowsersDatabaseConnection.model('FuelingOrder', fuelingOrderSchema, 'FuelingOrdersCollection');
