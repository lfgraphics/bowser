import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const tripExpensesSchema = new Schema({
    trip: { type: Schema.Types.ObjectId, ref: "TankersTrip", required: true },
    vehicleNo: { type: String, required: true },
    gr: { type: Schema.Types.ObjectId, ref: "GR", required: true },
    driver: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
    expense: { type: String, enum: ["Running", "Return", "Incentive", "Fooding", "Parking", "Other"], required: true },
    expenseType: { type: String, required: function () { return this.expense === "Other" } },
    amount: { type: Number, required: true },
    balancePayment: {
        type: Number,
        required: true,
        validate: {
            validator: function (v) { return v <= this.amount; },
            message: 'Balance payment cannot exceed total amount'
        },
        default: function () { return this.amount; }
    },
    paymentOrders: [{ type: Schema.Types.ObjectId, ref: 'TripPaymentOrder' }]
});

tripExpensesSchema.index({ trip: 1 });
tripExpensesSchema.index({ vehicleNo: 1 });
tripExpensesSchema.index({ gr: 1 });
tripExpensesSchema.index({ driver: 1 });
tripExpensesSchema.index({ expense: 1 });
tripExpensesSchema.index({ amount: 1 });

const TripExpenses = getTransportDatabaseConnection().model('TripExpenses', tripExpensesSchema, 'TripExpensesCollection');

export default TripExpenses;
