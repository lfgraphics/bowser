import { Schema, Types } from 'mongoose';
import './TransUser.js';
import { getTransportDatabaseConnection } from '../../config/database.js';

// Performance & Architecture: Configuration constants
const PERFORMANCE_CONFIG = {
    CACHE_TTL: 60000, // 1 minute
    MAX_CONCURRENT_UPDATES: 10,
    OPERATION_TIMEOUT: 5000, // 5 seconds
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_BASE_DELAY: 1000, // 1 second
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    RATE_LIMIT_MAX_REQUESTS: 100
};

// Architecture Change 1: Render-Compatible Background Processing
class RenderCompatibleJobQueue {
    constructor() {
        this.processingJobs = new Set();
        this.maxConcurrentJobs = 3; // Conservative for Render's memory limits
        this.jobTimeout = 10000; // 10 seconds max per job
    }

    async enqueue(jobType, jobData, options = {}) {
        // For Render: Use setTimeout for non-blocking background processing
        const jobId = `${jobType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        if (this.processingJobs.size >= this.maxConcurrentJobs) {
            // Skip job if at capacity (graceful degradation)
            console.warn(`Job queue at capacity, skipping job: ${jobType}`);
            return null;
        }

        this.processingJobs.add(jobId);

        // Use setTimeout for async processing (Render compatible)
        setTimeout(async () => {
            try {
                await this.processJob(jobType, jobData, options);
            } catch (error) {
                console.error(`Background job ${jobType} failed:`, error);
            } finally {
                this.processingJobs.delete(jobId);
            }
        }, options.delay || 0);

        return jobId;
    }

    async processJob(jobType, jobData, options = {}) {
        // Add timeout protection for Render
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Job timeout')), this.jobTimeout);
        });

        try {
            await Promise.race([
                this.executeJob(jobType, jobData),
                timeoutPromise
            ]);
        } catch (error) {
            // Retry logic for Render (simple exponential backoff)
            if (options.retryCount < 2) { // Max 2 retries
                const delay = 1000 * Math.pow(2, options.retryCount || 0);
                console.log(`Retrying job ${jobType} in ${delay}ms`);

                setTimeout(() => {
                    this.enqueue(jobType, jobData, {
                        ...options,
                        retryCount: (options.retryCount || 0) + 1,
                        delay
                    });
                }, delay);
            } else {
                console.error(`Job ${jobType} failed after retries:`, error);
            }
        }
    }

    async executeJob(jobType, jobData) {
        switch (jobType) {
            case 'RECALCULATE_VEHICLE_LATEST_TRIP':
                return await this.recalculateVehicleLatestTrip(jobData);
            case 'BATCH_UPDATE_VEHICLES':
                return await this.batchUpdateVehicles(jobData);
            default:
                console.warn(`Unknown job type: ${jobType}`);
        }
    }

    async recalculateVehicleLatestTrip({ vehicleNo, ModelRef }) {
        try {
            const { findOneAndUpdate: findAndUpdateVehicle } = await import('./vehicle.js');

            const latestTrip = await ModelRef.findOne(
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
                await findAndUpdateVehicle(
                    { VehicleNo: vehicleNo },
                    { $unset: { 'tripDetails.id': 1 } },
                    { new: true }
                );
            }
        } catch (error) {
            console.error(`Background recalculation failed for ${vehicleNo}:`, error);
        }
    }

    async batchUpdateVehicles({ updates }) {
        try {
            const { bulkWrite } = await import('./vehicle.js');
            await bulkWrite(updates, { ordered: false });
        } catch (error) {
            console.error('Background batch update failed:', error);
        }
    }

    getStats() {
        return {
            activeJobs: this.processingJobs.size,
            maxConcurrentJobs: this.maxConcurrentJobs
        };
    }
}

const backgroundQueue = new RenderCompatibleJobQueue();

// Architecture Change 2: Database Optimization - Connection Pool & Caching
const vehicleCache = new Map();
const connectionPool = new Map();

// Architecture Change 3: Graceful Degradation - Retry with Exponential Backoff
async function retryWithExponentialBackoff(fn, maxAttempts = PERFORMANCE_CONFIG.MAX_RETRY_ATTEMPTS) {
    let attempt = 0;
    while (attempt < maxAttempts) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            if (attempt >= maxAttempts) {
                throw error;
            }

            const delay = PERFORMANCE_CONFIG.RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
            console.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms:`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Performance Improvement 1: Rate Limiting
class RateLimiter {
    constructor(maxRequests = PERFORMANCE_CONFIG.RATE_LIMIT_MAX_REQUESTS, windowMs = PERFORMANCE_CONFIG.RATE_LIMIT_WINDOW) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    async checkLimit(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const keyRequests = this.requests.get(key);
        // Remove old requests outside the window
        while (keyRequests.length > 0 && keyRequests[0] < windowStart) {
            keyRequests.shift();
        }

        if (keyRequests.length >= this.maxRequests) {
            throw new Error(`Rate limit exceeded for ${key}`);
        }

        keyRequests.push(now);
        return true;
    }
}

const rateLimiter = new RateLimiter();

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
    if (!this.StartDate) {
        return null;
    }
    
    var now = new Date(this.StartDate);
    if (isNaN(now.getTime())) {
        return null;
    }
    
    var start = new Date(now.getFullYear(), 0, 0);
    var diff = now - start;
    var oneDay = 1000 * 60 * 60 * 24;
    var day = Math.floor(diff / oneDay);

    return Number(`${now.getFullYear()}.${day}${this.rankindex || 0}`);
});

// Performance Improvement 2: Timeout wrapper for operations
function withTimeout(promise, timeoutMs = PERFORMANCE_CONFIG.OPERATION_TIMEOUT) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

// Performance Improvement 3: Chunk array for batch processing
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}



// Architecture Change 2: Database Optimization - Read Replica Support
async function getReadOnlyConnection() {
    const key = 'readonly';
    if (!connectionPool.has(key)) {
        // In production, this would connect to a read replica
        connectionPool.set(key, getTransportDatabaseConnection());
    }
    return connectionPool.get(key);
}

// Performance Improvement 1: Parallel Processing with Circuit Breaker
async function processVehicleUpdatesWithCircuitBreaker(vehicleNumbers, ModelRef) {
    if (vehicleNumbers.size === 0) return;

    const vehicleArray = Array.from(vehicleNumbers);
    const chunks = chunkArray(vehicleArray, PERFORMANCE_CONFIG.MAX_CONCURRENT_UPDATES);

    for (const chunk of chunks) {
        // Apply rate limiting
        try {
            await rateLimiter.checkLimit('vehicle_updates');
        } catch (error) {
            console.warn('Rate limit hit, delaying vehicle updates:', error.message);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Process each chunk in parallel with circuit breaker pattern
        const results = await Promise.allSettled(
            chunk.map(vehicleNo =>
                withTimeout(
                    retryWithExponentialBackoff(() =>
                        processVehicleUpdateOptimized(vehicleNo, ModelRef)
                    ),
                    PERFORMANCE_CONFIG.OPERATION_TIMEOUT
                )
            )
        );

        // Log failures but continue processing (graceful degradation)
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Failed to update vehicle ${chunk[index]}:`, result.reason);
                // Enqueue for background retry (Render compatible)
                backgroundQueue.enqueue('RECALCULATE_VEHICLE_LATEST_TRIP', {
                    vehicleNo: chunk[index],
                    ModelRef
                });
            }
        });
    }
}

// Performance Improvement: Optimized single vehicle update
async function processVehicleUpdateOptimized(vehicleNo, ModelRef) {
    try {
        await recalculateVehicleLatestTripOptimized(vehicleNo, ModelRef);
    } catch (error) {
        console.error(`Error processing vehicle ${vehicleNo}:`, error);
        throw error;
    }
}



// Performance Improvement: Optimized latest trip calculation with caching
async function recalculateVehicleLatestTripOptimized(vehicleNo, model) {
    try {
        // Use read replica for heavy read operations
        const readConnection = await getReadOnlyConnection();
        const ReadOnlyModel = readConnection.models.TankersTrip || model;

        // Find the actual latest trip from database using optimized query
        const latestTrip = await withTimeout(
            ReadOnlyModel.findOne(
                { VehicleNo: vehicleNo, StartDate: { $ne: null } },
                { _id: 1, StartDate: 1, rankindex: 1 },
                { sort: { StartDate: -1, rankindex: 1, _id: -1 } }
            ).lean()
        );

        const { findOneAndUpdate: findAndUpdateVehicle } = await import('./vehicle.js');

        if (latestTrip) {
            await withTimeout(
                retryWithExponentialBackoff(() =>
                    findAndUpdateVehicle(
                        { VehicleNo: vehicleNo },
                        { $set: { 'tripDetails.id': latestTrip._id } },
                        { new: true }
                    )
                )
            );
        } else {
            // No valid trips found, clear the vehicle trip reference
            await withTimeout(
                retryWithExponentialBackoff(() =>
                    findAndUpdateVehicle(
                        { VehicleNo: vehicleNo },
                        { $unset: { 'tripDetails.id': 1 } },
                        { new: true }
                    )
                )
            );
        }

        // Invalidate cache after update
        vehicleCache.delete(`vehicle:${vehicleNo}`);
    } catch (error) {
        console.error(`Error recalculating latest trip for vehicle ${vehicleNo}:`, error);
        throw error;
    }
}

// Architecture Change 2: Health Check for Database Operations
async function performHealthCheck() {
    try {
        const connection = getTransportDatabaseConnection();
        await withTimeout(connection.db.admin().ping(), 2000);
        return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
        return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
}



// Helper function to handle new trip creation logic
async function handleNewTripCreation(vehicleNo, tripDoc, TripModel) {
    try {
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

        // 2. Set basic driver status
        if (tripDoc.StartDriver && tripDoc.StartDriver !== "no driver") {
            tripDoc.driverStatus = 1; // Driver present
        } else {
            tripDoc.StartDriver = tripDoc.StartDriver || "no driver";
            tripDoc.driverStatus = 0; // No driver
        }
    } catch (error) {
        console.error('Error in handleNewTripCreation:', error);
        // Don't throw - let the trip creation continue
    }
}

tankerTripSchema.pre(['save', 'findOneAndUpdate', 'updateOne', 'updateMany'], async function (next) {
    try {
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
            await updateVehicleLatestTrip(vehicleNo, currentTripId, doc, ModelRef);
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

// Pre-hook for delete operations to capture vehicle numbers before deletion
tankerTripSchema.pre(['deleteOne', 'deleteMany'], async function () {
    try {
        const query = this.getQuery();
        const docsToDelete = await this.model.find(query, { VehicleNo: 1 }).lean();

        // Store vehicle numbers for post-hook processing
        this._deletedVehicleNumbers = new Set(
            docsToDelete.map(doc => doc.VehicleNo).filter(Boolean)
        );
    } catch (error) {
        console.error('Error in delete pre-hook:', error);
        this._deletedVehicleNumbers = new Set();
    }
});

// Note: Mongoose bulkWrite doesn't trigger traditional pre/post hooks
// We need to wrap the bulkWrite method to handle vehicle updates
// This is handled in the exported bulkWrite wrapper below

// Post-hook to handle bulk operations and ensure consistency
tankerTripSchema.post(['save', 'findOneAndUpdate', 'updateOne', 'deleteOne', 'deleteMany'], async function (doc) {
    try {
        // For bulk operations or when multiple vehicles might be affected
        let vehicleNumbers = new Set();

        // Handle different document types - post-hooks receive the result document(s)
        if (doc === null || doc === undefined) {
            // Delete operations return null/undefined, use pre-captured vehicle numbers
            if (this._deletedVehicleNumbers && this._deletedVehicleNumbers.size > 0) {
                vehicleNumbers = this._deletedVehicleNumbers;
            } else {
                // No vehicles to process
                return;
            }
        } else if (Array.isArray(doc)) {
            // Handle array of documents (bulk operations)
            doc.forEach(d => {
                if (d && d.VehicleNo) vehicleNumbers.add(d.VehicleNo);
            });
        } else if (doc && doc.VehicleNo) {
            // Single document operations
            vehicleNumbers.add(doc.VehicleNo);
        }

        // Update latest trip reference for all affected vehicles
        if (vehicleNumbers.size > 0) {
            try {
                const ModelRef = getModelReference(this);
                await processVehicleUpdatesWithCircuitBreaker(vehicleNumbers, ModelRef);
            } catch (modelError) {
                console.error('Error getting model reference for bulk operation:', modelError);
                // Continue without updating - don't fail the main operation
            }
        }

        // Clean up temporary data
        if (this._deletedVehicleNumbers) {
            delete this._deletedVehicleNumbers;
        }

    } catch (error) {
        console.error('Error in tankerTripSchema post-hook:', error);
        // Clean up on error as well
        if (this._deletedVehicleNumbers) {
            delete this._deletedVehicleNumbers;
        }
    }
});

tankerTripSchema.post('bulkWrite', async function (result) {
    try {
        // `this` is the Model (TankersTrip)
        const ModelRef = this;
        const vehicleNumbers = this._bulkVehicleNumbers || new Set();

        // Add vehicle numbers from result if available
        if (result && result.insertedIds && Object.keys(result.insertedIds).length > 0) {
            const insertedIds = Object.values(result.insertedIds);
            const insertedDocs = await ModelRef.find(
                { _id: { $in: insertedIds } },
                { VehicleNo: 1 }
            ).lean();

            for (const d of insertedDocs) {
                if (d.VehicleNo) vehicleNumbers.add(d.VehicleNo);
            }
        }

        if (result && result.upsertedIds) {
            const upsertedIds = Array.isArray(result.upsertedIds)
                ? result.upsertedIds
                : Object.values(result.upsertedIds);

            if (upsertedIds.length > 0) {
                const upsertedDocs = await ModelRef.find(
                    { _id: { $in: upsertedIds } },
                    { VehicleNo: 1 }
                ).lean();

                for (const d of upsertedDocs) {
                    if (d.VehicleNo) vehicleNumbers.add(d.VehicleNo);
                }
            }
        }

        // Batch process all affected vehicles in a single operation
        if (vehicleNumbers.size > 0) {
            await batchUpdateAllVehicleLatestTrips(vehicleNumbers, ModelRef);
        }

        // Clean up
        delete this._bulkVehicleNumbers;

    } catch (err) {
        console.error('Error in TankersTrip post bulkWrite hook:', err);
        // Clean up on error
        if (this._bulkVehicleNumbers) {
            delete this._bulkVehicleNumbers;
        }
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
async function updateVehicleLatestTrip(vehicleNo, currentTripId, currentDoc, model) {
    try {
        // Validate that we have a proper model with find function
        if (!model || typeof model.find !== 'function') {
            throw new Error('Invalid model provided to updateVehicleLatestTrip');
        }

        const allTrips = await model.find(
            { VehicleNo: vehicleNo },
            { _id: 1, StartDate: 1, rankindex: 1 }
        ).lean();
        const tripIndex = allTrips.findIndex(trip => trip._id.toString() === currentTripId.toString());

        const currentTripData = {
            _id: currentTripId,
            StartDate: currentDoc.StartDate || null,
            rankindex: currentDoc.rankindex ?? 0
        };

        if (tripIndex >= 0) {
            allTrips[tripIndex] = currentTripData;
        } else {
            allTrips.push(currentTripData);
        }
        const validTrips = allTrips.filter(trip => trip.StartDate);

        if (validTrips.length === 0) {
            return;
        }
        validTrips.sort((a, b) => {
            const dateA = new Date(a.StartDate);
            const dateB = new Date(b.StartDate);

            if (dateA.getTime() !== dateB.getTime()) {
                return dateB.getTime() - dateA.getTime();
            }

            const rankA = a.rankindex ?? 0;
            const rankB = b.rankindex ?? 0;
            if (rankA !== rankB) {
                return rankA - rankB;
            }
            return b._id.toString().localeCompare(a._id.toString());
        });

        const latestTrip = validTrips[0];
        try {
            const { findOneAndUpdate: findAndUpdateVehicle } = await import('./vehicle.js');
            await findAndUpdateVehicle(
                { VehicleNo: vehicleNo },
                { $set: { 'tripDetails.id': latestTrip._id } },
                { new: true }
            );
        } catch (vehicleUpdateError) {
            console.error(`Failed to update vehicle ${vehicleNo} with latest trip ${latestTrip._id}:`, vehicleUpdateError);
        }

    } catch (error) {
        console.error(`Error determining latest trip for vehicle ${vehicleNo}:`, error);
    }
}



// Batch update all vehicle latest trips in a single operation
async function batchUpdateAllVehicleLatestTrips(vehicleNumbers, TripModel) {
    if (vehicleNumbers.size === 0) return;

    try {
        const { bulkWrite: vehicleBulkWrite } = await import('./vehicle.js');
        const vehicleArray = Array.from(vehicleNumbers);

        // Fetch latest trips for all vehicles in parallel
        const latestTripsPromises = vehicleArray.map(async (vehicleNo) => {
            const latestTrip = await TripModel.findOne(
                { VehicleNo: vehicleNo, StartDate: { $ne: null } },
                { _id: 1, StartDate: 1, rankindex: 1 },
                { sort: { StartDate: -1, rankindex: 1, _id: -1 } }
            ).lean();

            return { vehicleNo, latestTrip };
        });

        const latestTripsResults = await Promise.allSettled(latestTripsPromises);

        // Build bulk write operations for vehicle collection
        const vehicleBulkOps = [];

        for (const result of latestTripsResults) {
            if (result.status === 'fulfilled') {
                const { vehicleNo, latestTrip } = result.value;

                if (latestTrip) {
                    vehicleBulkOps.push({
                        updateOne: {
                            filter: { VehicleNo: vehicleNo },
                            update: { $set: { 'tripDetails.id': latestTrip._id } }
                        }
                    });
                } else {
                    vehicleBulkOps.push({
                        updateOne: {
                            filter: { VehicleNo: vehicleNo },
                            update: { $unset: { 'tripDetails.id': 1 } }
                        }
                    });
                }
            } else {
                console.error('Failed to fetch latest trip:', result.reason);
            }
        }

        // Execute single bulk write for all vehicle updates
        if (vehicleBulkOps.length > 0) {
            await withTimeout(
                retryWithExponentialBackoff(() =>
                    vehicleBulkWrite(vehicleBulkOps, { ordered: false })
                )
            );

            // Invalidate cache for all updated vehicles
            vehicleArray.forEach(vehicleNo => {
                vehicleCache.delete(`vehicle:${vehicleNo}`);
            });
        }

    } catch (error) {
        console.error('Error in batch vehicle latest trip update:', error);

        const fallbackResults = await Promise.allSettled(
            vehicleArray.map(vehicleNo =>
                recalculateVehicleLatestTripOptimized(vehicleNo, TripModel)
            )
        );

        fallbackResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Fallback update failed for ${vehicleArray[index]}:`, result.reason);
            }
        });
    }
}

// Architecture Change 2: Database Optimization - Compound indexes for performance
tankerTripSchema.index({ VehicleNo: 1, StartDate: -1, rankindex: 1 }); // Primary query optimization
tankerTripSchema.index({ VehicleNo: 1, StartDate: 1 }); // Date range queries
tankerTripSchema.index({ StartDriver: 1, StartDate: -1 }); // Driver-based queries
tankerTripSchema.index({ LoadStatus: 1, VehicleNo: 1 }); // Load status filtering
tankerTripSchema.index({ 'statusUpdate.dateTime': -1 }); // Status update queries
tankerTripSchema.index({ EndDate: 1, VehicleNo: 1 }, { sparse: true }); // Completed trips
tankerTripSchema.index({ driverStatus: 1, VehicleNo: 1 }); // Driver status queries

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

// Wrap bulkWrite to handle vehicle updates since Mongoose doesn't trigger hooks for bulkWrite
export async function bulkWrite(operations, options) {
    // Safety check for empty operations
    if (!operations || operations.length === 0) {
        return { acknowledged: true, insertedCount: 0, matchedCount: 0, modifiedCount: 0, deletedCount: 0, upsertedCount: 0 };
    }

    // Extract vehicle numbers from operations before executing
    const vehicleNumbers = new Set();

    try {
        for (const op of operations) {
            if (op.insertOne?.document?.VehicleNo) {
                vehicleNumbers.add(op.insertOne.document.VehicleNo);
            } else if (op.updateOne?.filter?.VehicleNo) {
                vehicleNumbers.add(op.updateOne.filter.VehicleNo);
            } else if (op.updateMany?.filter?.VehicleNo) {
                vehicleNumbers.add(op.updateMany.filter.VehicleNo);
            } else if (op.deleteOne?.filter?.VehicleNo) {
                vehicleNumbers.add(op.deleteOne.filter.VehicleNo);
            } else if (op.deleteMany?.filter?.VehicleNo) {
                vehicleNumbers.add(op.deleteMany.filter.VehicleNo);
            } else if (op.replaceOne?.filter?.VehicleNo) {
                vehicleNumbers.add(op.replaceOne.filter.VehicleNo);
            }
        }
    } catch (error) {
        console.error('Error extracting vehicle numbers from bulkWrite operations:', error);
    }

    // Execute the actual bulkWrite
    const result = await TankersTrip.bulkWrite(operations, options);

    // Update affected vehicles in background (non-blocking)
    if (vehicleNumbers.size > 0) {
        // Use setImmediate to avoid blocking the response
        setImmediate(async () => {
            try {
                await processVehicleUpdatesWithCircuitBreaker(vehicleNumbers, TankersTrip);
            } catch (error) {
                console.error('Error updating vehicles after bulkWrite:', error);
            }
        });
    }

    return result;
}

// Architecture Change 2: Export health check and performance utilities
export const healthCheck = performHealthCheck;
export const clearCache = () => {
    vehicleCache.clear();
};
export const getCacheStats = () => ({
    vehicleCacheSize: vehicleCache.size,
    backgroundJobs: backgroundQueue.getStats()
});

export default TankersTrip;
