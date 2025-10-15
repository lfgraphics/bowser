import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const campUsersSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    locations: [{
        type: String,
        trim: true
    }],
    configs: {
        type: Map,
        of: Schema.Types.Mixed,
        default: () => new Map([
            ['allowedExpenses', {
                hotel: 200,
                fooding: 200,
                petrol: 2, // rupees per liter
                readonly: true
            }],
            ['preferences', {
                readonly: false
            }],
            ['permissions', {
                readonly: true
            }]
        ])
    },
    role: {
        type: String,
        enum: ['admin', 'officer', 'supervisor'],
        default: 'officer'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    accountLocked: { type: Boolean, default: false },
    lockUntil: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

export default getTransportDatabaseConnection().model('CampUser', campUsersSchema, 'CampUsers');