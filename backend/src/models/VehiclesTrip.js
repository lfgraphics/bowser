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
    driverStatus: { type: Number, default: 1 },
}, {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

tankerTripSchema.virtual('tripDay').get(function () {
    var now = new Date(this.StartDate);
    var start = new Date(now.getFullYear(), 0, 0);
    var diff = now - start;
    var oneDay = 1000 * 60 * 60 * 24;
    var day = Math.floor(diff / oneDay);

    return Number(`${now.getFullYear()}.${day}${this.rankindex}`);
});

// Helper function to handle new trip creation logic
async function handleNewTripCreation(vehicleNo, tripDoc, TripModel) {
    try {
        // Import vehicle and driver log models
        const { findOne: findVehicle, findOneAndUpdate: updateVehicle } = await import('./vehicle.js');
        const { findOne: findDriverLog, create: createDriverLog } = await import('./VehicleDriversLog.js');
        const { findOne: findDriver } = await import('./driver.js');
        
        // 1. Check and set rankindex for trips on the same date
        // New trips should appear on top (rankindex: 0), so increment existing trips
        if (tripDoc.StartDate) {
            const startDate = new Date(tripDoc.StartDate);
            const dayStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            
            // Find all trips for this vehicle on the same day (excluding current trip)
            const tripsOnSameDay = await TripModel.find({
                VehicleNo: vehicleNo,
                _id: { $ne: tripDoc._id }, // Exclude current trip
                StartDate: {
                    $gte: dayStart,
                    $lt: dayEnd
                }
            }).lean();
            
            if (tripsOnSameDay.length > 0) {
                // Increment rankindex of all existing trips on this day
                await TripModel.updateMany(
                    {
                        VehicleNo: vehicleNo,
                        _id: { $ne: tripDoc._id },
                        StartDate: {
                            $gte: dayStart,
                            $lt: dayEnd
                        }
                    },
                    { $inc: { rankindex: 1 } }
                );
            }
            
            // Set new trip to rankindex 0 (appears on top)
            tripDoc.rankindex = 0;
        }
        
        // 2. Check and update driver status - PRIORITIZE TRIP DATA
        const vehicle = await findVehicle({ VehicleNo: vehicleNo }).lean();
        
        if (!vehicle) return;
        
        const currentVehicleDriver = vehicle.tripDetails?.driver;
        const tripDriver = tripDoc.StartDriver;
        
        // PRIORITY 1: If trip has a driver assigned, use it
        if (tripDriver && tripDriver !== "no driver") {
            // Find driver by name to get ID
            const driver = await findDriver({ Name: tripDriver }).lean();
            
            if (driver) {
                // Check if there's already a joining log for this driver on this vehicle
                const existingLog = await findDriverLog({ 
                    vehicleNo, 
                    driver: driver._id,
                    'joining.date': { $exists: true }
                }).sort({ creationDate: -1 }).limit(1).lean();
                
                // Only create joining log if:
                // 1. No existing log, OR
                // 2. Last log has a leaving entry (driver left and is now rejoining)
                const shouldCreateLog = !existingLog || (existingLog && existingLog.leaving);
                
                if (shouldCreateLog) {
                    // Get location from trip or use default
                    let location = tripDoc.StartFrom || 'Unknown';
                    if (tripDoc.TravelHistory && tripDoc.TravelHistory.length > 0) {
                        location = tripDoc.TravelHistory[0].LocationOnTrackUpdate || location;
                    }
                    
                    // Create joining entry with trip's start date
                    await createDriverLog({
                        vehicleNo,
                        driver: driver._id,
                        joining: {
                            date: tripDoc.StartDate,
                            odometer: tripDoc.LoadTripDetail?.StartOdometer || tripDoc.EmptyTripDetail?.StartOdometer || 0,
                            location,
                            tripId: tripDoc._id,
                            vehicleLoadStatus: tripDoc.LoadStatus,
                            remark: 'Auto-assigned from trip creation'
                        }
                    });
                }
            }
            
            // Update vehicle driver status to match trip
            if (currentVehicleDriver !== tripDriver) {
                await updateVehicle(
                    { VehicleNo: vehicleNo },
                    { $set: { 'tripDetails.driver': tripDriver } }
                );
            }
            
            tripDoc.driverStatus = 1; // Driver present
        }
        // PRIORITY 2: Vehicle has "no driver" - check for auto-continue
        else if (currentVehicleDriver === "no driver" || !currentVehicleDriver) {
            // Check if there's a driver log with tillDate that has passed
            const lastLog = await findDriverLog({ vehicleNo })
                .sort({ creationDate: -1 })
                .populate('driver')
                .lean();
            
            if (lastLog && lastLog.leaving && lastLog.leaving.tillDate) {
                const tillDate = new Date(lastLog.leaving.tillDate);
                const tripStartDate = new Date(tripDoc.StartDate);
                
                // If trip starts on or after tillDate, auto-continue the driver
                if (tripStartDate >= tillDate && lastLog.driver) {
                    const driverName = lastLog.driver.Name || lastLog.driver.name;
                    const driverId = lastLog.driver._id;
                    
                    // Get last location from leaving or trip start
                    let location = lastLog.leaving.location || tripDoc.StartFrom || 'Unknown';
                    if (tripDoc.TravelHistory && tripDoc.TravelHistory.length > 0) {
                        location = tripDoc.TravelHistory[0].LocationOnTrackUpdate || location;
                    }
                    
                    // Create joining entry with trip's start date
                    await createDriverLog({
                        vehicleNo,
                        driver: driverId,
                        joining: {
                            date: tripDoc.StartDate,
                            odometer: tripDoc.LoadTripDetail?.StartOdometer || tripDoc.EmptyTripDetail?.StartOdometer || 0,
                            location,
                            tripId: tripDoc._id,
                            vehicleLoadStatus: tripDoc.LoadStatus,
                            remark: 'Auto-continued after leave period'
                        }
                    });
                    
                    // Update vehicle and trip with driver info
                    await updateVehicle(
                        { VehicleNo: vehicleNo },
                        { $set: { 'tripDetails.driver': driverName } }
                    );
                    
                    tripDoc.StartDriver = driverName;
                    tripDoc.driverStatus = 1; // Driver present
                } else {
                    // No driver to continue, mark as no driver
                    tripDoc.StartDriver = tripDoc.StartDriver || "no driver";
                    tripDoc.driverStatus = 0; // No driver
                }
            } else {
                // No previous driver log, mark as no driver
                tripDoc.StartDriver = tripDoc.StartDriver || "no driver";
                tripDoc.driverStatus = 0; // No driver
            }
        }
        // PRIORITY 3: Vehicle has a driver - sync trip with vehicle
        else {
            if (!tripDoc.StartDriver || tripDoc.StartDriver === "no driver") {
                tripDoc.StartDriver = currentVehicleDriver;
            }
            tripDoc.driverStatus = 1; // Driver present
        }
    } catch (error) {
        console.error('Error in handleNewTripCreation:', error);
        // Don't throw - let the trip creation continue
    }
}

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
        let isNewTrip = false;

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
            isNewTrip = true;
            vehicleNo = doc.VehicleNo;
            currentTripId = doc._id || this._id;
        }

        // Skip if no VehicleNo or no trip ID available
        if (!vehicleNo || !currentTripId) {
            return next();
        }

        // Get the model reference properly
        try {
            const ModelRef = getModelReference(this);
            
            // For new trips, handle driver status and rankindex
            if (isNewTrip && doc.StartDate) {
                await handleNewTripCreation(vehicleNo, doc, ModelRef);
            }
            
            // Always check and update vehicle reference for any trip modification
            await updateVehicleLatestTrip(vehicleNo, currentTripId, doc, isUpdateOperation, ModelRef);
        } catch (modelError) {
            console.error('Error in trip pre-hook for vehicle:', vehicleNo, modelError);
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

        // Update latest trip reference and verify driver status for all affected vehicles
        try {
            const ModelRef = getModelReference(this);
            for (const vehicleNo of vehicleNumbers) {
                await recalculateVehicleLatestTrip(vehicleNo, ModelRef);
                await verifyDriverStatus(vehicleNo, ModelRef);
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

// Helper function to verify and sync driver status between trip and vehicle
async function verifyDriverStatus(vehicleNo, TripModel) {
    try {
        const { findOne: findVehicle, findOneAndUpdate: updateVehicle } = await import('./vehicle.js');
        
        // Get the latest trip for this vehicle
        const latestTrip = await TripModel.findOne(
            { VehicleNo: vehicleNo, StartDate: { $ne: null } },
            { StartDriver, driverStatus: 1, _id: 1 }
        ).sort({ StartDate: -1, rankindex: 1 }).lean();
        
        if (!latestTrip) return;
        
        // Get current vehicle status
        const vehicle = await findVehicle({ VehicleNo: vehicleNo }).lean();
        
        if (!vehicle) return;
        
        const vehicleDriver = vehicle.tripDetails?.driver;
        const tripDriver = latestTrip.StartDriver;
        
        // Check if they're in sync
        if (vehicleDriver !== tripDriver) {
            // Sync vehicle with trip (trip is source of truth)
            if (tripDriver && tripDriver !== "no driver") {
                await updateVehicle(
                    { VehicleNo: vehicleNo },
                    { $set: { 'tripDetails.driver': tripDriver } }
                );
            } else if (!tripDriver || tripDriver === "no driver") {
                await updateVehicle(
                    { VehicleNo: vehicleNo },
                    { $set: { 'tripDetails.driver': 'no driver' } }
                );
            }
        }
        
        // Update trip driverStatus if needed
        const expectedDriverStatus = (tripDriver && tripDriver !== "no driver") ? 1 : 0;
        if (latestTrip.driverStatus !== expectedDriverStatus) {
            await TripModel.updateOne(
                { _id: latestTrip._id },
                { $set: { driverStatus: expectedDriverStatus } }
            );
        }
    } catch (error) {
        console.error(`Error verifying driver status for vehicle ${vehicleNo}:`, error);
    }
}

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
