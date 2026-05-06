import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const routeSchema = new Schema({
    Name: {
        type: String,
        required: true,
        unique: true
    },
    Country: {
        type: String,
        required: true
    },
    From: {
        type: String,
        required: true
    },
    To: {
        type: String,
        required: true
    },
    Distance: {
        type: Schema.Types.Mixed,
        validate: {
            validator: function (v) {
                return typeof v === 'string' || typeof v === 'number';
            },
            message: 'Distance must be string or number'
        }
    },
    NoofToll: {
        type: Schema.Types.Mixed,
        validate: {
            validator: function (v) {
                return typeof v === 'string' || typeof v === 'number';
            },
            message: 'Number of tolls must be string or number'
        }
    },
    Via: { type: String, required: false },
    PumpDetail: [
        {
            PumpName: {
                type: String,
                required: true
            },
            StartPoint: {
                type: Schema.Types.Mixed,
                validate: {
                    validator: function (v) {
                        return typeof v === 'string' || typeof v === 'number';
                    },
                    message: 'Start point must be string or number'
                }
            },
            OffRoad: {
                type: Schema.Types.Mixed,
                validate: {
                    validator: function (v) {
                        return typeof v === 'string' || typeof v === 'number';
                    },
                    message: 'Off road must be string or number'
                }
            },
            EndPoint: {
                type: Schema.Types.Mixed,
                validate: {
                    validator: function (v) {
                        return typeof v === 'string' || typeof v === 'number';
                    },
                    message: 'End point must be string or number'
                }
            }
        }
    ]
});

routeSchema.index({ From: 1 });
routeSchema.index({ To: 1 });

// Helper function to stringify the route name
const generateRouteName = (from, to) => {
    return `${from} To ${to}`;
};

// Pre-save hook (for create and save)
routeSchema.pre('save', function (next) {
    if (this.isModified('From') || this.isModified('To')) {
        this.Name = generateRouteName(this.From, this.To);
    }
    next();
});

// Pre-update hooks (for updateOne, updateMany, findOneAndUpdate)
// Note: This relies on "From" and "To" being available in the update payload to update the Name.
const updateHooks = ['updateOne', 'updateMany', 'findOneAndUpdate'];
updateHooks.forEach((hook) => {
    routeSchema.pre(hook, async function (next) {
        try {
            const update = this.getUpdate();

            // Extract fields from $set or direct update object
            const from = update.From || (update.$set && update.$set.From);
            const to = update.To || (update.$set && update.$set.To);

            // Case 1: Both fields are present in the update
            // We can safely generate the new Name for all document(s)
            if (from && to) {
                const newName = generateRouteName(from, to);
                if (update.$set) {
                    update.$set.Name = newName;
                } else {
                    update.Name = newName;
                }
            }
            // Case 2: Partial update (only From or only To)
            else if (from || to) {
                // CRITICAL: For updateMany, we must skip fetching a single document to guess the Name,
                // as that would incorrectly apply one route's details to all matched routes.
                if (hook === 'updateMany') {
                    return next();
                }

                // For single document updates (updateOne, findOneAndUpdate), we can safely fetch the doc
                const doc = await this.model.findOne(this.getQuery());
                if (doc) {
                    const newName = generateRouteName(from || doc.From, to || doc.To);
                    if (update.$set) {
                        update.$set.Name = newName;
                    } else {
                        update.Name = newName;
                    }
                }
            }
            next();
        } catch (error) {
            next(error);
        }
    });
});

const Route = getTransportDatabaseConnection().model('Route', routeSchema, 'RoutesCollection');

// Export model methods as named exports
export const find = Route.find.bind(Route);
export const findOne = Route.findOne.bind(Route);
export const findById = Route.findById.bind(Route);
export const findOneAndUpdate = Route.findOneAndUpdate.bind(Route);
export const findByIdAndUpdate = Route.findByIdAndUpdate.bind(Route);
export const updateOne = Route.updateOne.bind(Route);
export const updateMany = Route.updateMany.bind(Route);
export const deleteOne = Route.deleteOne.bind(Route);
export const deleteMany = Route.deleteMany.bind(Route);
export const create = Route.create.bind(Route);
export const insertMany = Route.insertMany.bind(Route);
export const countDocuments = Route.countDocuments.bind(Route);
export const distinct = Route.distinct.bind(Route);
export const aggregate = Route.aggregate.bind(Route);
export const bulkWrite = Route.bulkWrite.bind(Route);

export default Route;