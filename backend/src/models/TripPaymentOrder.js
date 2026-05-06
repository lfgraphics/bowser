import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const tripPaymentOrderSchema = new Schema({
    type: { type: String, enum: ["cash", "account"], required: true },
    voucherNumber: { type: String, required: false },
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },
    expenses: [ // to keep track of which trip, which specific expense item is paid
        {
            tripExpenses: { type: Schema.Types.ObjectId, ref: "TripExpenses", required: true },
            expenseItemId: { type: Schema.Types.ObjectId, required: true },
            type: { type: String },
            amount: { type: Number }
        }
    ],
    amount: { type: Number, required: true },
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    paymentInfo: {
        paymentDate: { type: Date },
        account: { type: String, enum: ['ITPL', 'INFRA', 'EXPO'] },
        referenceNumber: { type: String },
        photo: { type: String },
        remark: { type: String }
    }
});

tripPaymentOrderSchema.index({ type: 1 });
tripPaymentOrderSchema.index({ status: 1 });

const TripPaymentOrder = getTransportDatabaseConnection().model('TripPaymentOrder', tripPaymentOrderSchema, 'TripPaymentOrdersCollection');

export default TripPaymentOrder;
