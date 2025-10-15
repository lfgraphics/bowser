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

const CampUser = getTransportDatabaseConnection().model('CampUser', campUsersSchema, 'CampUsers');

// Export model methods as named exports
export const find = CampUser.find.bind(CampUser);
export const findOne = CampUser.findOne.bind(CampUser);
export const findById = CampUser.findById.bind(CampUser);
export const findOneAndUpdate = CampUser.findOneAndUpdate.bind(CampUser);
export const findByIdAndUpdate = CampUser.findByIdAndUpdate.bind(CampUser);
export const findByIdAndDelete = CampUser.findByIdAndDelete.bind(CampUser);
export const findOneAndDelete = CampUser.findOneAndDelete.bind(CampUser);
export const updateOne = CampUser.updateOne.bind(CampUser);
export const updateMany = CampUser.updateMany.bind(CampUser);
export const deleteOne = CampUser.deleteOne.bind(CampUser);
export const deleteMany = CampUser.deleteMany.bind(CampUser);
export const create = CampUser.create.bind(CampUser);
export const insertMany = CampUser.insertMany.bind(CampUser);
export const countDocuments = CampUser.countDocuments.bind(CampUser);
export const distinct = CampUser.distinct.bind(CampUser);
export const aggregate = CampUser.aggregate.bind(CampUser);
export const bulkWrite = CampUser.bulkWrite.bind(CampUser);

export default CampUser;