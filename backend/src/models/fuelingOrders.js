import { Schema, Types } from 'mongoose';
import moment from "moment-timezone";
import { getBowsersDatabaseConnection } from '../../config/database.js';

const fuelingOrderSchema = new Schema({
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
  request: { type: Types.ObjectId, ref: 'FuelRequest' },
  seen: { type: Boolean, default: false },
  fulfilled: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => moment().tz("Asia/Kolkata").toDate() },
});

// Validate the quantityType
fuelingOrderSchema.methods.validateQuantityType = function () {
  return ['Full', 'Part'].includes(this.quantityType);
};

const FuelingOrder = getBowsersDatabaseConnection().model('FuelingOrder', fuelingOrderSchema, 'FuelingOrdersCollection');

// Export model methods as named exports
export const find = FuelingOrder.find.bind(FuelingOrder);
export const findOne = FuelingOrder.findOne.bind(FuelingOrder);
export const findById = FuelingOrder.findById.bind(FuelingOrder);
export const findOneAndUpdate = FuelingOrder.findOneAndUpdate.bind(FuelingOrder);
export const findByIdAndUpdate = FuelingOrder.findByIdAndUpdate.bind(FuelingOrder);
export const findByIdAndDelete = FuelingOrder.findByIdAndDelete.bind(FuelingOrder);
export const updateOne = FuelingOrder.updateOne.bind(FuelingOrder);
export const updateMany = FuelingOrder.updateMany.bind(FuelingOrder);
export const deleteOne = FuelingOrder.deleteOne.bind(FuelingOrder);
export const deleteMany = FuelingOrder.deleteMany.bind(FuelingOrder);
export const create = FuelingOrder.create.bind(FuelingOrder);
export const insertMany = FuelingOrder.insertMany.bind(FuelingOrder);
export const countDocuments = FuelingOrder.countDocuments.bind(FuelingOrder);
export const distinct = FuelingOrder.distinct.bind(FuelingOrder);
export const aggregate = FuelingOrder.aggregate.bind(FuelingOrder);
export const bulkWrite = FuelingOrder.bulkWrite.bind(FuelingOrder);

export default FuelingOrder;
