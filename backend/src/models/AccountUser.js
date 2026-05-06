import mongoose from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        sparse: true, // Allows nulls while keeping unique constraint
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        select: false // Don't return password by default in queries
    },
    role: {
        type: String,
        enum: ['cashierAdmin', 'tempCashier', 'grManager', 'accountant', 'admin'],
        default: 'grManager'
    },
    permissions: [{
        type: String // e.g., ['read:gr', 'create:trip', 'manage:users']
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    validTill: {
        type: Date,
        required: function () {
            return this.role === 'tempCashier';
        }
    },
    lastLogin: {
        type: Date
    },
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AccountUser'
    },
    refreshToken: {
        type: String,
        select: false // Don't return refresh token by default
    },
    refreshTokenExpiry: {
        type: Date,
        select: false
    },
    resetToken: {
        type: String,
        select: false
    },
    resetTokenExpiry: {
        type: Date,
        select: false
    },
    forcePasswordChange: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Instance method to check if account is locked
userSchema.methods.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

const AccountUser = getTransportDatabaseConnection().model('AccountUser', userSchema, 'AccountUsers');

export default AccountUser;