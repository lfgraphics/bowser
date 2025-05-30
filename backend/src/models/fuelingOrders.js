const mongoose = require('mongoose');
const moment = require("moment-timezone");
const { bowsersDatabaseConnection } = require('../../config/database');

const fuelingOrderSchema = new mongoose.Schema({
  allocationType: {
    type: String,
    enum: ["bowser", "external", "internal"],
    required: false
  },
  pumpAllocationType: {
    type: String,
    required: false
  },
  fuelProvider: { type: String, required: false },
  petrolPump: { type: String, required: false },
  pumpLocation: { type: String, required: false },
  vehicleNumber: { type: String, required: false },
  odoMeter: { type: String, required: false },
  tripId: { type: String, required: false },
  category: { type: String, required: true },
  party: { type: String, required: false, default: "Own" },
  driverId: { type: String, required: false },
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
      phoneNo: { type: String, },
      location: { type: String }
    }
  },
  allocationAdmin: {
    name: { type: String, required: true },
    id: { type: String, required: true },
  },
  request: { type: mongoose.Types.ObjectId, ref: 'FuelRequest' },
  seen: { type: Boolean, default: false },
  fulfilled: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => moment().tz("Asia/Kolkata").toDate() },
});

// Validate the quantityType
fuelingOrderSchema.methods.validateQuantityType = function () {
  return ['Full', 'Part'].includes(this.quantityType);
};

module.exports = bowsersDatabaseConnection.model('FuelingOrder', fuelingOrderSchema, 'FuelingOrdersCollection');
