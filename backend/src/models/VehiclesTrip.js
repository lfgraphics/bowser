import { Schema, Types } from 'mongoose';
import './TransUser.js';
import { findOneAndUpdate as findAndUpdateVehicle } from './vehicle.js'
import { getTransportDatabaseConnection } from '../../config/database.js';

const tankerTripSchema = new Schema({
    VehicleNo: { type: String, required: true },
    // Day-wise ranking index for trips starting on the same date (lower value = higher priority)
    rankindex: { type: Number, default: 0 },
    StartDate: { type: Date },
    targetTime: { type: Date },
    StartFrom: { type: String },
    EndTo: { type: String },
    LoadStatus: { type: Number },
    LoadTripDetail: {
        LoadDate: { type: Date },
        ReportDate: { type: Date },
        UnloadDate: { type: Date },
        StartOdometer: { type: Number },
        EndOdometer: { type: Number },
        SupplyFrom: { type: String },
        SupplyTo: { type: String },
        NameOfGoods: { type: String },
        LoadDetail: {
            LoadQty: { type: Number },
            UnloadQty: { type: Number },
            ShortQty: { type: Number },
            DeductionComment: { type: String },
        }
    },
    EmptyTripDetail: {
        VehicleNo: { type: String },
        ProposedDestination: { type: String },
        ProposedDate: { type: Date },
        ReportDate: { type: Date },
        EndDate: { type: Date },
        StartOdometer: { type: Number },
        EndOdometer: { type: Number },
        PreviousTripId: { type: Types.ObjectId, ref: 'TankersTrip' },
        PreviousTripIdNew: { type: String },
        ProposedBy: { type: String },
        OrderedBy: { type: String },
        Division: { type: Number },
    },
    TravelHistory: [
        new Schema({
            TrackUpdateDate: { type: Date },
            LocationOnTrackUpdate: { type: String },
            OdometerOnTrackUpdate: { type: Number },
            ManagerComment: { type: String },
            Driver: { type: String },
        }, { _id: false })
    ],
    TallyLoadDetail: {
        BillingPartyName: { type: String },
        BillingRoute: { type: String },
        BooksOf: { type: String },
        Consignee: { type: String },
        Consignor: { type: String },
        DieselRoute: { type: String },
        DriverLicenseNo: { type: String },
        DriverLicenseValidityDate: { type: String },
        DriverName: { type: String },
        EndOdometer: { type: Number },
        FinancialyClose: { type: Number },
        FinancialyCloseDate: { type: String },
        Goods: { type: String },
        GRNo: { type: String },
        GUID: { type: String },
        KMbyDieseRoute: { type: Number },
        KMbyRoute: { type: Number },
        LoadingDate: { type: Date },
        LoadingQty: { type: Number },
        MasterId: { type: Number },
        OperationalyClose: { type: Number },
        PartyLedger: { type: String },
        PersistedView: { type: String },
        ReportedDate: { type: Date },
        ShortageQty: { type: Number },
        StartOdometer: { type: Number },
        SyncDateTime: { type: Date },
        TripId: { type: String },
        UnloadingDate: { type: Date },
        UnloadingQty: { type: Number },
        UnloadingTime: { type: Number },
        VehicleMode: { type: String },
        VoucherDate: { type: Date },
        VoucherKey: { type: Number },
        VoucherNo: { type: String },
        VoucherType: { type: String }
    },
    StartDriver: { type: String },
    StartDriverMobile: { type: String },
    OpretionallyModified: { type: Boolean },
    ReportingDate: { type: Date },
    loadingSuperVisor: { type: String },
    EndDate: { type: Date },
    LastSyncDate: { type: Date },
    statusUpdate: [
        {
            dateTime: { type: Date, required: true },
            user: {
                _id: { type: Types.ObjectId, ref: 'TransAppUser' },
                name: String
            },
            status: {
                type: String,
                enum: ["In Distillery", "In Depot", "Accident", 'Custom', 'Breakdown', 'Loaded'],
                required: true
            },
            comment: { type: String, required: false }
        }
    ],
    driverStatus: { type: Number, default: 1 }
}, { versionKey: false });

tankerTripSchema.virtual("startDateOnly").get(function () {
    if (!this.StartDate) return null;

    const d = new Date(this.StartDate);
    d.setHours(0, 0, 0, 0); // truncate to midnight
    return d;
});

tankerTripSchema.pre(['save', 'findOneAndUpdate', 'updateOne', 'updateMany', 'bulkWrite'], async function (next) {
    try {
        // Skip for bulk operations as they should handle their own vehicle updates
        if (this.op === 'bulkWrite') {
            return next();
        }

        // Get the document being saved/updated
        let doc = this;
        let vehicleNo = null;
        let currentTripId = null;
        let isUpdateOperation = false;

        if (this.getUpdate) {
            isUpdateOperation = true;
            const update = this.getUpdate();
            const query = this.getQuery();

            // For update operations, we need to get the complete document state after update
            if (update.VehicleNo || update.$set?.VehicleNo) {
                vehicleNo = update.VehicleNo || update.$set.VehicleNo;
                // Get the existing document to merge with updates
                const ModelRef = getModelReference(this);
                const existingDoc = await ModelRef.findOne(query).lean();
                if (existingDoc) {
                    currentTripId = existingDoc._id;
                    // Merge existing document with updates to get final state
                    doc = {
                        ...existingDoc,
                        ...update,
                        ...(update.$set || {}),
                        ...(update.$unset ? Object.keys(update.$unset).reduce((acc, key) => {
                            acc[key] = undefined;
                            return acc;
                        }, {}) : {})
                    };
                }
            } else {
                // Fetch existing document to get VehicleNo and merge updates
                const ModelRef = getModelReference(this);
                const existingDoc = await ModelRef.findOne(query).lean();
                if (existingDoc) {
                    vehicleNo = existingDoc.VehicleNo;
                    currentTripId = existingDoc._id;
                    // Merge existing document with updates
                    doc = {
                        ...existingDoc,
                        ...update,
                        ...(update.$set || {}),
                        ...(update.$unset ? Object.keys(update.$unset).reduce((acc, key) => {
                            acc[key] = undefined;
                            return acc;
                        }, {}) : {})
                    };
                }
            }
        } else {
            // For save operations (create/insert)
            vehicleNo = doc.VehicleNo;
            currentTripId = doc._id || this._id;
        }

        // Skip if no VehicleNo or no trip ID available
        if (!vehicleNo || !currentTripId) {
            return next();
        }

        // Always check and update vehicle reference for any trip modification
        // This ensures the vehicle always points to the truly latest trip

        // Create a comprehensive query to find the actual latest trip after this operation
        // We need to simulate what the database will look like after this operation completes

        // Get the model reference properly
        try {
            const ModelRef = getModelReference(this);
            await updateVehicleLatestTrip(vehicleNo, currentTripId, doc, isUpdateOperation, ModelRef);
        } catch (modelError) {
            console.error('Error getting model reference for vehicle:', vehicleNo, modelError);
            // Continue without updating - don't fail the main operation
        }

        next();
    } catch (error) {
        console.error('Error in tankerTripSchema pre-hook:', error);
        next(error);
    }
});

// Post-hook to handle bulk operations and ensure consistency
tankerTripSchema.post(['save', 'findOneAndUpdate', 'updateOne', 'deleteOne', 'deleteMany', 'bulkWrite'], async function (doc, next) {
    try {
        // For bulk operations or when multiple vehicles might be affected
        let vehicleNumbers = new Set();

        if (this.op === 'deleteOne' || this.op === 'deleteMany') {
            // For delete operations, we need to recalculate for affected vehicles
            const deletedDocs = Array.isArray(doc) ? doc : [doc];
            deletedDocs.forEach(d => {
                if (d && d.VehicleNo) vehicleNumbers.add(d.VehicleNo);
            });
        } else if (this.op === 'bulkWrite') {
            // For bulk operations, extract all affected vehicle numbers
            if (this.result && this.result.insertedIds) {
                // Get inserted documents
                const ModelRef = getModelReference(this);
                const insertedDocs = await ModelRef.find({
                    _id: { $in: Object.values(this.result.insertedIds) }
                }, { VehicleNo: 1 }).lean();
                insertedDocs.forEach(d => {
                    if (d.VehicleNo) vehicleNumbers.add(d.VehicleNo);
                });
            }
            // Note: Updated/deleted documents in bulk operations are harder to track
            // Consider adding vehicle tracking in the actual bulk operation if needed
        } else if (doc && doc.VehicleNo) {
            // Regular operations
            vehicleNumbers.add(doc.VehicleNo);
        }

        // Update latest trip reference for all affected vehicles
        try {
            const ModelRef = getModelReference(this);
            for (const vehicleNo of vehicleNumbers) {
                await recalculateVehicleLatestTrip(vehicleNo, ModelRef);
            }
        } catch (modelError) {
            console.error('Error getting model reference for bulk operation:', modelError);
            // Continue without updating - don't fail the main operation
        }

        if (next) next();
    } catch (error) {
        console.error('Error in tankerTripSchema post-hook:', error);
        if (next) next();
    }
});

// Helper function to get the correct model reference in different middleware contexts
function getModelReference(context) {
    // Try different ways to get the model reference depending on the middleware context
    if (context.model && typeof context.model.find === 'function') {
        return context.model;
    }
    if (context.constructor?.model && typeof context.constructor.model.find === 'function') {
        return context.constructor.model;
    }
    if (context.constructor && typeof context.constructor.find === 'function') {
        return context.constructor;
    }
    
    // Fallback: try to get the model from the connection
    try {
        const connection = getTransportDatabaseConnection();
        if (connection.models.TankersTrip) {
            return connection.models.TankersTrip;
        }
    } catch (error) {
        console.error('Error getting model reference:', error);
    }
    
    throw new Error('Could not find valid model reference in middleware context');
}

// Helper function to determine and update the latest trip for a vehicle
async function updateVehicleLatestTrip(vehicleNo, currentTripId, currentDoc, isUpdate, model) {
    try {
        // Validate that we have a proper model with find function
        if (!model || typeof model.find !== 'function') {
            throw new Error('Invalid model provided to updateVehicleLatestTrip');
        }
        
        // Get all trips for this vehicle to determine the latest one
        // This includes the current document state for accurate comparison
        const allTrips = await model.find(
            { VehicleNo: vehicleNo },
            { _id: 1, StartDate: 1, rankindex: 1 }
        ).lean();

        // If this is an update operation, replace the existing document in our list
        // If it's a create operation, add it to the list
        const tripIndex = allTrips.findIndex(trip => trip._id.toString() === currentTripId.toString());

        const currentTripData = {
            _id: currentTripId,
            StartDate: currentDoc.StartDate || null,
            rankindex: currentDoc.rankindex ?? 0
        };

        if (tripIndex >= 0) {
            // Update existing trip data
            allTrips[tripIndex] = currentTripData;
        } else {
            // Add new trip data
            allTrips.push(currentTripData);
        }

        // Filter out trips without StartDate as they shouldn't be considered for "latest"
        const validTrips = allTrips.filter(trip => trip.StartDate);

        if (validTrips.length === 0) {
            // No valid trips, skip vehicle update
            return;
        }

        // Sort trips exactly as specified: StartDate DESC, then rankindex ASC
        validTrips.sort((a, b) => {
            const dateA = new Date(a.StartDate);
            const dateB = new Date(b.StartDate);

            // First sort by StartDate descending (latest first)
            if (dateA.getTime() !== dateB.getTime()) {
                return dateB.getTime() - dateA.getTime();
            }

            // If same date, sort by rankindex ascending (lower rank = higher priority)
            const rankA = a.rankindex ?? 0;
            const rankB = b.rankindex ?? 0;
            if (rankA !== rankB) {
                return rankA - rankB;
            }

            // If same date and rank, sort by _id for deterministic order
            return b._id.toString().localeCompare(a._id.toString());
        });

        // The first trip in the sorted array is the latest
        const latestTrip = validTrips[0];

        // Only update vehicle if the latest trip has changed
        try {
            await findAndUpdateVehicle(
                { VehicleNo: vehicleNo },
                { $set: { 'tripDetails.id': latestTrip._id } },
                { new: true }
            );
        } catch (vehicleUpdateError) {
            // Log error but don't fail the trip operation
            console.error(`Failed to update vehicle ${vehicleNo} with latest trip ${latestTrip._id}:`, vehicleUpdateError);
        }

    } catch (error) {
        console.error(`Error determining latest trip for vehicle ${vehicleNo}:`, error);
        // Don't throw - let the main operation continue
    }
}

// Helper function to recalculate latest trip from database (for post-hooks and cleanup)
async function recalculateVehicleLatestTrip(vehicleNo, model) {
    try {
        // Find the actual latest trip from database using the exact sort criteria
        const latestTrip = await model.findOne(
            { VehicleNo: vehicleNo, StartDate: { $ne: null } },
            { _id: 1, StartDate: 1, rankindex: 1 },
            { sort: { StartDate: -1, rankindex: 1, _id: -1 } }
        ).lean();

        if (latestTrip) {
            await findAndUpdateVehicle(
                { VehicleNo: vehicleNo },
                { $set: { 'tripDetails.id': latestTrip._id } },
                { new: true }
            );
        } else {
            // No valid trips found, clear the vehicle trip reference
            await findAndUpdateVehicle(
                { VehicleNo: vehicleNo },
                { $unset: { 'tripDetails.id': 1 } },
                { new: true }
            );
        }
    } catch (error) {
        console.error(`Error recalculating latest trip for vehicle ${vehicleNo}:`, error);
    }
}

tankerTripSchema.set("toJSON", { virtuals: true });
tankerTripSchema.set("toBSON", { virtuals: true });
tankerTripSchema.set("toObject", { virtuals: true });

// Optimize common queries: by vehicle with date and rank ordering
tankerTripSchema.index({ VehicleNo: 1, StartDate: -1, rankindex: 1 });

const TankersTrip = getTransportDatabaseConnection().model('TankersTrip', tankerTripSchema, 'TankersTrips');

// Export model methods as named exports
export const find = TankersTrip.find.bind(TankersTrip);
export const findOne = TankersTrip.findOne.bind(TankersTrip);
export const findById = TankersTrip.findById.bind(TankersTrip);
export const findOneAndUpdate = TankersTrip.findOneAndUpdate.bind(TankersTrip);
export const findByIdAndUpdate = TankersTrip.findByIdAndUpdate.bind(TankersTrip);
export const updateOne = TankersTrip.updateOne.bind(TankersTrip);
export const updateMany = TankersTrip.updateMany.bind(TankersTrip);
export const deleteOne = TankersTrip.deleteOne.bind(TankersTrip);
export const deleteMany = TankersTrip.deleteMany.bind(TankersTrip);
export const create = TankersTrip.create.bind(TankersTrip);
export const insertMany = TankersTrip.insertMany.bind(TankersTrip);
export const countDocuments = TankersTrip.countDocuments.bind(TankersTrip);
export const distinct = TankersTrip.distinct.bind(TankersTrip);
export const aggregate = TankersTrip.aggregate.bind(TankersTrip);
export const bulkWrite = TankersTrip.bulkWrite.bind(TankersTrip);

export default TankersTrip;
