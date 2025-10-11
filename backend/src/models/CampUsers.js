const mongoose = require('mongoose');
const { transportDatabaseConnection } = require('../../config/database');

const campUsersSchema = new mongoose.Schema({
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
        of: mongoose.Schema.Types.Mixed,
        default: () => new Map([
            ['allowedExpenses', {
                hotel: 200,
                fooding: 100,
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

// Indexes for better performance
campUsersSchema.index({ phone: 1 }, { unique: true });
campUsersSchema.index({ email: 1 }, { unique: true, sparse: true });
campUsersSchema.index({ role: 1 });
campUsersSchema.index({ status: 1 });

// Virtual for account lock status
campUsersSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to update updatedAt
campUsersSchema.pre('save', function (next) {
    if (!this.isNew) {
        this.updatedAt = Date.now();
    }
    next();
});

// Method to get config value
campUsersSchema.methods.getConfig = function (key, defaultValue = null) {
    return this.configs.get(key) || defaultValue;
};

// Method to set config value
campUsersSchema.methods.setConfig = function (key, value) {
    this.configs.set(key, value);
    return this.save();
};

module.exports = transportDatabaseConnection.model('CampUser', campUsersSchema, 'CampUsers');