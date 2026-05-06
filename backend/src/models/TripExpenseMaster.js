import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const tripExpenseMasterSchema  = new Schema({
    wheelType: { type: String, enum: ['12 Wheeler', '14 Wheeler', '16 Wheeler', '22 Wheeler', '16 Trellar', '22 Trellar'], required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    days: { type: Number, required: true },
    running: {
        perDay: { type: Number, required: true },
        efffectiveFrom: { type: Date, required: true },
    },
    return: {
        total: { type: Number, required: true },
        efffectiveFrom: { type: Date, required: true },
    },
    fooding: {
        perDay: { type: Number, required: true },
        efffectiveFrom: { type: Date, required: true },
    },
    incentive: {
        total: { type: Number, required: true },
        efffectiveFrom: { type: Date, required: true },
    },
    parking: {
        perDay: { type: Number, required: true },
        efffectiveFrom: { type: Date, required: true },
    },
    other: [
        { type: String, amount: Number, required: false, efffectiveFrom: { type: Date, required: true } }
    ],
    totalExpense: { type: Number, required: true, validate: { validator: (v) => v >= 0 } },
});

tripExpenseMasterSchema .index({ wheelType: 1 });
tripExpenseMasterSchema .index({ from: 1 });
tripExpenseMasterSchema .index({ to: 1 });

const TripExpenseMaster = getTransportDatabaseConnection().model('TripExpenseMaster', tripExpenseMasterSchema , 'TripExpenseMastersCollection');

export default TripExpenseMaster;
