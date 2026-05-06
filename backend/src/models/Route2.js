import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const routeSchema = new Schema({
    displayTitle: { type: String, required: true },

    originLocation: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    origin: { type: Schema.Types.ObjectId, ref: "Destination", required: true },

    destinationLocation: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    destination: { type: Schema.Types.ObjectId, ref: "Destination", required: true },

    totalDistance: { type: Number, required: true },

    via: { type: Schema.Types.ObjectId, ref: "Location", required: false },

    stationsUnderRoute: [
        {
            station: { type: Schema.Types.ObjectId, ref: "Destination", required: true },
            distanceFromOrigin: { type: Number, required: true },
            offRoadDistance: { type: Number, required: false },
            turningPointFromOrigin: { type: Number, required: false },
            turningPointFromDestination: { type: Number, required: false },
        }
    ]
});

routeSchema.index({ displayTitle: 1 });

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