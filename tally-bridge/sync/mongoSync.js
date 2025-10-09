import pkg from 'mongodb';
const { MongoClient } = pkg;
import { config } from 'dotenv';
import { join } from 'path';
import isDev from 'electron-is-dev';
import { addLog } from '../logger.js';
import { getConfig } from './config.js';

// Load environment variables for atlasUri (fixed, not user-configurable)
const envPath = isDev ? '.env' : join(process.resourcesPath, 'env.production');
config({ path: envPath });

// Get URIs: atlasUri from environment, localUri from user config with fallback
const atlasUri = process.env.atlasUri || 'mongodb+srv://default-atlas-uri'; // Fallback if env not loaded

console.log('🔍 MongoDB Environment Configuration:');
console.log(`  - Environment file: ${envPath}`);
console.log(`  - Environment loaded: ${!!process.env.atlasUri}`);
console.log(`  - Atlas URI: ${atlasUri ? 'CONFIGURED' : 'MISSING'}`);

// Function to get current local URI (dynamic, reloads from config each time)
function getCurrentLocalUri() {
    return getConfig('localUri') || process.env.localUri || 'mongodb://localhost:27017';
}

addLog(`MongoDB Atlas URI configured: ${atlasUri ? 'OK' : 'MISSING'}`);

// Export function to update local URI configuration
export async function updateLocalUri(newLocalUri) {
    try {
        const { saveConfig } = await import('./config.js');
        const success = saveConfig({ localUri: newLocalUri });
        if (success) {
            addLog(`Local URI updated to: ${newLocalUri}`);
            
            // Force close existing local connection to use new URI on next sync
            if (localClient) {
                console.log('🔄 Closing existing local connection due to URI change...');
                await localClient.close();
                localClient = null;
                addLog('Local DB connection closed - will reconnect with new URI on next sync');
            }
            
            return true;
        } else {
            addLog('Failed to save local URI configuration', 'ERROR');
            return false;
        }
    } catch (error) {
        addLog(`Error updating local URI: ${error.message}`, 'ERROR');
        return false;
    }
}

const localDbName = "TransappDataHub";
const localTripCollectionName = "TripDataCollection";
const atlasTransportDbName = "TransportData";
const atlasTripCollectionName = "VehiclesCollection";

const now = new Date();
const past30Days = new Date(now);
const past6Months = new Date(now);
past30Days.setDate(now.getDate() - 180);
past6Months.setMonth(now.getMonth() - 3);

const localTripFilter = {
    $and: [
        // { $or: [{ "TallyLoadDetail.UnloadingDate": { $exists: false } }, { "TallyLoadDetail.UnloadingDate": { $ne: null } }] },
        // { "EndDate": { $exists: false } },
        { StartDate: { $gte: past30Days, $lte: now } },
        { "TallyLoadDetail.Goods": { $ne: "HSD" } }
    ]
};

let localClient;
let atlasClient;
let log = console.log;

function setLogger(customLogger) {
    log = (message) => {
        console.log(message);       // still log to terminal
        customLogger?.(message);    // also push to UI logs
    };
}

// Function to establish connections
async function connectToDatabases() {
    // Get current URIs (localUri is dynamic, atlasUri is static)
    const currentLocalUri = getCurrentLocalUri();
    
    console.log('🔄 Connection attempt with:');
    console.log(`  - Local URI: ${currentLocalUri}`);
    console.log(`  - Local URI source: ${getConfig('localUri') ? 'USER_CONFIG' : process.env.localUri ? 'ENVIRONMENT' : 'DEFAULT'}`);
    
    if (!currentLocalUri || !atlasUri) {
        throw new Error(`Missing required URIs: ${!currentLocalUri ? 'localUri' : ''} ${!atlasUri ? 'atlasUri' : ''}`);
    }

    // Check if local URI changed - if so, close existing connection
    if (localClient && localClient.options && localClient.options.hosts[0].host !== new URL(currentLocalUri).hostname) {
        console.log('🔄 Local URI changed, closing existing connection...');
        await localClient.close();
        localClient = null;
    }

    if (!localClient || !localClient.topology || !localClient.topology.isConnected()) {
        localClient = new MongoClient(currentLocalUri);
        await localClient.connect();
        addLog(`Connected to local DB Successfully: ${currentLocalUri}`);
    } else {
        addLog("Reusing existing Local DB connection.");
    }

    if (!atlasClient || !atlasClient.topology || !atlasClient.topology.isConnected()) {
        atlasClient = new MongoClient(atlasUri);
        await atlasClient.connect();
        addLog("Connected to Atlas DB Successfully");
    } else {
        addLog("Reusing existing Atlas DB connection.");
    }
}

// Function to close connections
export async function closeConnections() {
    await localClient?.close();
    await atlasClient?.close();
}

// Client functions defination
async function syncDriversData() {
    const localCollection = localClient.db('TransappDataHub').collection('DetailedDriverCollection');
    const atlasCollection = atlasClient.db('TransportData').collection('DriversCollection');

    addLog("---------------------------------------");
    addLog("Syncing Drivers Data...");

    // Step 1: Fetch all data from Atlas and Local
    let atlasData = await atlasCollection.find(
        { Name: { $regex: 'ITPL', $options: 'i' } },
        { projection: { MobileNo: 0, password: 0, deviceUUID: 0, resetToken: 0, resetTokenExpiry: 0, roles: 0, verified: 0, keypad: 0, inActive: 0, pushToken: 0, generationTime: 0 } }
    ).toArray();
    let localData = await localCollection.find(
        { Name: { $regex: 'ITPL', $options: 'i' } }
    ).toArray();

    // Merge duplicates in Atlas by Name into a single rich document, then delete redundant docs
    try {
        const authFields = ['password', 'deviceUUID', 'resetToken', 'resetTokenExpiry', 'roles', 'verified', 'keypad', 'inActive', 'pushToken', 'generationTime', 'MobileNo', 'ITPLId'];

        const normalizeName = (n) => (n || '').trim();
        const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

        const scoreDoc = (doc) => {
            let s = 0;
            if (!isEmpty(doc.ITPLId)) s += 3;
            if (!isEmpty(doc.password)) s += 3;
            if (!isEmpty(doc.roles)) s += 1;
            if (!isEmpty(doc.verified)) s += 1;
            if (!isEmpty(doc.MobileNo)) s += 1;
            if (!isEmpty(doc.generationTime)) s += 1;
            return s;
        };

        const deepMerge = (a, b) => {
            // Merge b into a and return a new object (shallow copies with a few deep cases)
            const result = { ...a };
            for (const [k, v] of Object.entries(b)) {
                if (k === '_id') continue;
                const av = result[k];
                // Auth fields: prefer existing value on result (primary), only fill if missing
                if (authFields.includes(k)) {
                    if (isEmpty(av) && !isEmpty(v)) result[k] = v;
                    continue;
                }
                if (Array.isArray(av) && Array.isArray(v)) {
                    // Merge unique values by JSON stringify
                    const set = new Map();
                    for (const item of av) set.set(JSON.stringify(item), item);
                    for (const item of v) set.set(JSON.stringify(item), item);
                    result[k] = Array.from(set.values());
                } else if (av && typeof av === 'object' && v && typeof v === 'object' && !Array.isArray(av) && !Array.isArray(v)) {
                    result[k] = deepMerge(av, v);
                } else {
                    // Prefer non-empty value; if primary empty, take from b
                    if (isEmpty(av) && !isEmpty(v)) result[k] = v;
                }
            }
            return result;
        };

        // Fetch full docs for merging (need auth + profile fields)
        const atlasFull = await atlasCollection.find(
            { Name: { $regex: 'ITPL', $options: 'i' } }
        ).toArray();

        const groups = atlasFull.reduce((acc, doc) => {
            const key = normalizeName(doc.Name);
            if (!acc.has(key)) acc.set(key, []);
            acc.get(key).push(doc);
            return acc;
        }, new Map());

        const updateOps = [];
        const idsToDelete = [];

        for (const [name, docs] of groups) {
            if (docs.length <= 1) continue;
            // choose primary by score; tie-breaker by generationTime desc then _id desc
            docs.sort((a, b) => {
                const ds = scoreDoc(b) - scoreDoc(a);
                if (ds !== 0) return ds;
                const ta = a.generationTime ? new Date(a.generationTime).getTime() : 0;
                const tb = b.generationTime ? new Date(b.generationTime).getTime() : 0;
                if (tb !== ta) return tb - ta;
                return b._id.toString().localeCompare(a._id.toString());
            });
            const primary = docs[0];
            let merged = { ...primary };
            for (let i = 1; i < docs.length; i++) {
                merged = deepMerge(merged, docs[i]);
                idsToDelete.push(docs[i]._id);
            }
            // Build $set excluding undefined and _id
            const setObj = {};
            for (const [k, v] of Object.entries(merged)) {
                if (k === '_id' || v === undefined) continue;
                setObj[k] = v;
            }
            updateOps.push({
                updateOne: {
                    filter: { _id: primary._id },
                    update: { $set: setObj }
                }
            });
        }

        if (updateOps.length > 0) {
            const res = await atlasCollection.bulkWrite(updateOps);
            addLog(`Merged and updated ${res.modifiedCount} Atlas driver document(s) by Name.`);
        }
        if (idsToDelete.length > 0) {
            const resDel = await atlasCollection.deleteMany({ _id: { $in: idsToDelete } });
            addLog(`Deleted ${resDel.deletedCount} redundant Atlas driver document(s) after merge.`);
        }

        // Refresh atlasData after merge (use original projection to reduce payload)
        atlasData = await atlasCollection.find(
            { Name: { $regex: 'ITPL', $options: 'i' } },
            { projection: { MobileNo: 0, password: 0, deviceUUID: 0, resetToken: 0, resetTokenExpiry: 0, roles: 0, verified: 0, keypad: 0, inActive: 0, pushToken: 0, generationTime: 0 } }
        ).toArray();
    } catch (e) {
        console.error('Error while merging duplicate Atlas drivers: ', e);
        addLog(`Error while merging duplicate Atlas drivers: ${e.message || e}`, 'ERROR');
    }

    // Deduplicate by provided key (e.g., Name)
    function deduplicateByKey(arr, key) {
        const seen = new Map();
        for (const doc of arr) {
            if (doc[key] && !seen.has(doc[key])) {
                seen.set(doc[key], doc);
            }
        }
        return Array.from(seen.values());
    }

    atlasData = deduplicateByKey(atlasData, 'Name');
    localData = deduplicateByKey(localData, 'Name');

    addLog("Fetched drivers data from Atlas: " + atlasData.length + " documents.");
    addLog("Fetched drivers data from Local:" + localData.length + " documents.");

    // Build Atlas map by normalized Name, not _id, to reconcile with Local
    const normalizeName = (n) => (n || '').trim();
    const atlasDataMap = new Map(atlasData.map(doc => [normalizeName(doc.Name), doc]));

    const newDocumentsToAtlas = [];
    const updatedDocumentsToAtlas = [];
    const updateMobileInLocal = [];
    const updateMobileInAtlas = [];

    // Helper: deep sort object keys for stable JSON compare
    function sortObjectDeep(obj) {
        if (Array.isArray(obj)) return obj.map(sortObjectDeep);
        if (obj && typeof obj === 'object') {
            return Object.keys(obj)
                .sort()
                .reduce((acc, key) => {
                    acc[key] = sortObjectDeep(obj[key]);
                    return acc;
                }, {});
        }
        return obj;
    }

    // Step 3: Iterate over Local Data to find new or mismatched data
    for (const localDoc of localData) {
        const atlasDoc = atlasDataMap.get(normalizeName(localDoc.Name));

        if (!atlasDoc) {
            newDocumentsToAtlas.push(localDoc);
        } else {
            // Fill missing fields from Local into Atlas doc without overwriting auth/sensitive fields
            const banned = new Set(['_id', 'password', 'deviceUUID', 'resetToken', 'resetTokenExpiry', 'roles', 'verified', 'keypad', 'inActive', 'pushToken', 'generationTime', 'ITPLId']);
            const setObj = {};
            for (const [k, v] of Object.entries(localDoc)) {
                if (banned.has(k)) continue;
                const cur = atlasDoc[k];
                const empty = (val) => val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
                if (empty(cur) && !empty(v)) {
                    setObj[k] = v;
                }
            }
            if (Object.keys(setObj).length > 0) {
                updatedDocumentsToAtlas.push({
                    updateOne: {
                        filter: { _id: atlasDoc._id },
                        update: { $set: setObj }
                    }
                });
            }
        }
    }

    // Step 4: Insert new documents to Atlas in bulk if there are any
    if (newDocumentsToAtlas.length > 0) {
        await atlasCollection.insertMany(newDocumentsToAtlas);
        addLog(`Inserted ${newDocumentsToAtlas.length} new Drivers to Atlas.`);
    } else { addLog('Nothing to add in atlas') }

    if (updatedDocumentsToAtlas.length > 0) {
        await atlasCollection.bulkWrite(updatedDocumentsToAtlas);
        addLog(`Updated ${updatedDocumentsToAtlas.length} Drivers in Atlas.`);
    } else { addLog('Nothing to update in atlas') }

    // Step 5: Update Local MobileNos in bulk if there are any
    if (updateMobileInLocal.length > 0) {
        const bulkOps = updateMobileInLocal.map(doc => ({
            updateOne: {
                filter: { _id: doc._id },
                update: { $set: { MobileNo: doc.MobileNo } }
            }
        }));
        await localCollection.bulkWrite(bulkOps);
        addLog(`Updated MobileNo for ${updateMobileInLocal.length} drivers in Local.`);
    } else { addLog('Nothing to update in local') }

    // Step 6: Update Atlas MobileNos in bulk if there are any
    if (updateMobileInAtlas.length > 0) {
        const bulkOps = updateMobileInAtlas.map(doc => ({
            updateOne: {
                filter: { _id: doc._id },
                update: { $set: { MobileNo: doc.MobileNo } }
            }
        }));
        await atlasCollection.bulkWrite(bulkOps);
        console.log(`Updated MobileNo for ${updateMobileInAtlas.length} documents in Atlas.`);
        addLog(`Updated MobileNo for ${updateMobileInAtlas.length} drivers in Atlas.`);
    } else { console.log('Nothing to update in atlas'); addLog('Nothing to update in atlas') }
    addLog("Drivers Data Sync Completed.");
    addLog("---------------------------------------");
}

async function syncVechiclesData() {
    const localCollection = localClient.db('TransappDataHub').collection('VehicleCollection');
    const atlasCollection = atlasClient.db('TransportData').collection('VehiclesCollection');

    addLog("---------------------------------------");
    addLog("Syncing Vehicles Data...");

    // Step 1: Fetch all data from Atlas and Local
    const atlasData = await atlasCollection.find().toArray();
    console.log("Fetched vehicles data from Atlas:", atlasData.length, "documents.");
    // addLog("Fetched vehicles data from Atlas:" + atlasData.length, "documents.");

    const atlasDataMap = new Map(atlasData.map(doc => [doc._id.toString(), doc]));

    const localData = await localCollection.find({ AssetsType: { $regex: 'Own', $options: 'i' } }, { projection: { _id: 1, VehicleNo: 1, GoodsCategory: 1 } }).toArray();
    console.log("Fetched vehicles data from Local:", localData.length, "documents.");
    // addLog("Fetched vehicles data from Local:" + localData.length, "documents.");

    // Step 2: Prepare new documents to insert into Atlas
    const newDocumentsToAtlas = [];
    const updatedVehicles = [];
    const bulkOps = [];

    for (const localDoc of localData) {
        if (!atlasDataMap.has(localDoc._id.toString())) {
            // Document exists in Local but not in Atlas, add to newDocumentsToAtlas
            newDocumentsToAtlas.push(localDoc);
        }
        const atlasDoc = atlasDataMap.get(localDoc._id.toString());
        if (atlasDoc && atlasDoc.GoodsCategory !== localDoc.GoodsCategory) {
            // Update the GoodsCategory in Atlas if it is different
            bulkOps.push({
                updateOne: {
                    filter: { _id: atlasDoc._id },
                    update: { $set: { GoodsCategory: localDoc.GoodsCategory } }
                }
            });
            updatedVehicles.push(localDoc._id); // Track the update
        }
    }

    // Step 3: Insert new documents to Atlas in bulk if there are any
    if (newDocumentsToAtlas.length > 0) {
        await atlasCollection.insertMany(newDocumentsToAtlas);
        console.log(`Inserted ${newDocumentsToAtlas.length} new documents to Atlas.`);
        addLog(`Inserted ${newDocumentsToAtlas.length} new Vehicles to Atlas.`);
    } else {
        console.log('Nothing new to sync')
        addLog('Nothing new to sync')
    }
    if (bulkOps.length > 0) {
        await atlasCollection.bulkWrite(bulkOps);
        console.log(`Updated ${bulkOps.length} documents to Atlas.`);
        addLog(`Updated ${bulkOps.length} Vehicles to Atlas.`);
    } else {
        console.log('Nothing new to sync')
        addLog('Nothing new to sync')
    }

    addLog("Vehicles Data Sync Completed.");
    addLog("---------------------------------------");
}

async function syncAttachedVechicles() {
    const localCollection = localClient.db('TransappDataHub').collection('VehicleCollection');
    const atlasCollection = atlasClient.db('TransportData').collection('AttatchedVehiclesCollection');

    addLog("---------------------------------------");
    addLog("Syncing Attached Vehicles Data...");

    // Step 1: Fetch all data from Atlas and Local
    const atlasData = await atlasCollection.find().toArray();
    console.log("Fetched Attached vehicles data from Atlas:", atlasData.length, "documents.");
    // addLog("Fetched Attached vehicles data from Atlas:" + atlasData.length, "documents.");

    const atlasDataMap = new Map(atlasData.map(doc => [doc._id.toString(), doc]));

    const localData = await localCollection.find({ AssetsType: { $regex: 'Attached', $options: 'i' } }, { projection: { _id: 1, VehicleNo: 1, TransportPartenName: 1, GoodsCategory: 1 } }).toArray();
    console.log("Fetched Attached vehicles data from Local:", localData.length, "documents.");
    // addLog("Fetched Attached vehicles data from Local:" + localData.length, "documents.");

    // Step 2: Prepare new documents to insert into Atlas
    const newDocumentsToAtlas = [];
    const updatedVehicles = [];
    const bulkOps = [];


    for (const localDoc of localData) {
        if (!atlasDataMap.has(localDoc._id.toString())) {
            // Document exists in Local but not in Atlas, add to newDocumentsToAtlas
            newDocumentsToAtlas.push(localDoc);
        }
        const atlasDoc = atlasDataMap.get(localDoc._id.toString());
        if (atlasDoc && atlasDoc.GoodsCategory !== localDoc.GoodsCategory) {
            // Update the GoodsCategory in Atlas if it is different
            bulkOps.push({
                updateOne: {
                    filter: { _id: atlasDoc._id },
                    update: { $set: { GoodsCategory: localDoc.GoodsCategory } }
                }
            });
            updatedVehicles.push(localDoc._id); // Track the update
        }
    }

    // Step 3: Insert new documents to Atlas in bulk if there are any
    if (newDocumentsToAtlas.length > 0) {
        await atlasCollection.insertMany(newDocumentsToAtlas);
        console.log(`Inserted ${newDocumentsToAtlas.length} new documents to Atlas.`);
        addLog(`Inserted ${newDocumentsToAtlas.length} new Attached Vehicles to Atlas.`);
    } else {
        console.log('Nothing new to sync')
        addLog('Nothing new to sync')
    }

    addLog("Attached Vehicles Data Sync Completed.");
    addLog("---------------------------------------");
}

async function syncTripData() {
    const localCollection = localClient.db(localDbName).collection(localTripCollectionName);
    const atlasCollection = atlasClient.db(atlasTransportDbName).collection(atlasTripCollectionName);

    addLog("---------------------------------------");
    addLog("Syncing Vehicles Data...");

    const openedTrips = [];
    const updatedTrips = [];
    const closedTrips = [];
    let noUpdatesNeeded = 0;

    // Step 1: Fetch data from Local and Atlas
    const [atlasVehicles, localTrips] = await Promise.all([
        atlasCollection.find().toArray(),
        localCollection.find(localTripFilter).toArray(),
    ]);

    console.log(`Fetched ${atlasVehicles.length} vehicles from Atlas.`);
    console.log(`Fetched ${localTrips.length} trips from Local.`);

    // Step 2: Prepare bulk operations for MongoDB Atlas
    const bulkOps = [];

    for (const vehicle of atlasVehicles) {
        const matchingTrips = localTrips.filter(trip => trip.VehicleNo === vehicle.VehicleNo);

        if (matchingTrips.length > 0) {
            // Find the latest trip based on StartDate
            const latestTrip = matchingTrips.reduce((latest, current) =>
                new Date(current.StartDate) > new Date(latest.StartDate) ? current : latest
            );

            const tripDetails = {
                id: latestTrip._id,
                tripId: latestTrip.TallyLoadDetail?.TripId,
                product: latestTrip.TallyLoadDetail?.Goods,
                driver: latestTrip.StartDriver,
                open: true,
                loadStatus: latestTrip.LoadStatus == 0 ? 'Empty' : 'Loaded',
                from: latestTrip.StartFrom,
                to: latestTrip.EndTo,
                startedOn: latestTrip.StartDate
            };

            // Skip update if tripDetails.id matches current tripDetails.id
            if (vehicle.tripDetails?.id?.toString() === latestTrip._id.toString()) {  //
                noUpdatesNeeded++;                                                    //    comment this block to update tripDetails
                continue;                                                             //    even if the trip is same
            }                                                                         //

            // Update the tripDetails, preserve existing MobileNo
            bulkOps.push({
                updateOne: {
                    filter: { _id: vehicle._id },
                    update: {
                        $set: {
                            tripDetails: {
                                ...tripDetails,
                                driver: latestTrip.StartDriver,
                            }
                        }
                    }
                }
            });

            updatedTrips.push(vehicle.VehicleNo);
        } else if (vehicle.tripDetails?.open) {
            // Close trips with no matching local trip
            bulkOps.push({
                updateOne: {
                    filter: { _id: vehicle._id },
                    update: { $set: { "tripDetails.open": false } }
                }
            });
            closedTrips.push(vehicle.VehicleNo);
        } else {
            noUpdatesNeeded++;
        }
    }

    // Step 3: Execute bulk update
    if (bulkOps.length > 0) {
        const result = await atlasCollection.bulkWrite(bulkOps);
        console.log(`Bulk update result: ${result.modifiedCount} documents updated.`);
    }

    // Step 4: Log summary
    console.log(`${openedTrips.length} trips opened.`);
    addLog(`${openedTrips.length} trips opened.`);
    console.log(`${updatedTrips.length} vehicles updated.`);
    addLog(`${updatedTrips.length} vehicles updated.`);
    console.log(`${closedTrips.length} trips closed.`);
    addLog(`${closedTrips.length} trips closed.`);
    console.log(`${noUpdatesNeeded} vehicles required no updates.`);
    // addLog(`${noUpdatesNeeded} vehicles required no updates.`);

    addLog("Vehicles Data Sync Completed.");
    addLog("---------------------------------------");
}

async function syncTrips() {
    const localCollection = localClient.db(localDbName).collection(localTripCollectionName);
    const atlasCollection = atlasClient.db(atlasTransportDbName).collection('TankersTrips');

    addLog("---------------------------------------");
    addLog("Syncing Trips Data...");

    const openedTrips = [];
    const updatedTrips = [];
    const deletedTrips = [];
    let noUpdatesNeeded = 0;

    // Step 1: Fetch data from Local and Atlas
    const [atlasTrips, localTrips] = await Promise.all([
        atlasCollection.find({ LoadStatus: 1 }).toArray(),
        localCollection.find({ StartDate: { $gte: past6Months, $lte: now }, LoadStatus: 1 }).toArray(),
    ]);


    console.log(`Fetched ${atlasTrips.length} trips from Atlas.`);
    console.log(`Fetched ${localTrips.length} trips from Local.`);

    // Create maps for quick lookup
    const localTripsMap = new Map(localTrips.map(trip => [trip._id.toString(), trip]));
    const atlasTripsMap = new Map(atlasTrips.map(trip => [trip._id.toString(), trip]));

    const loadStatusZeroCount = localTrips.filter(trip => trip.LoadStatus === 0).length;
    console.log(`Local trips with LoadStatus: 0: ${loadStatusZeroCount}`);
    const missingInAtlas = localTrips.filter(trip => trip.LoadStatus === 0 && !atlasTripsMap.has(trip._id.toString()));
    console.log(`Missing in Atlas (LoadStatus: 0): ${missingInAtlas.length}`);

    // Step 2: Prepare bulk operations for MongoDB Atlas
    const bulkOps = [];

    // Sync local changes to cloud (update or insert)
    for (const localTrip of localTrips) {
        const atlasTrip = atlasTripsMap.get(localTrip._id.toString());
        if (atlasTrip && atlasTrip.OpretionallyModified === true) {
            // Skip update if OpretionallyModified is true in Atlas
            noUpdatesNeeded++;
            continue;
        }
        if (!atlasTrip) {
            // Not in Atlas, insert
            bulkOps.push({
                insertOne: { document: localTrip }
            });
            openedTrips.push(localTrip._id);
        } else {
            if (JSON.stringify(localTrip) !== JSON.stringify(atlasTrip)) {
                // bulkOps.push({
                //     updateOne: {
                //         filter: { _id: localTrip._id },
                //         update: { $set: localTrip }
                //     }
                // });
                // updatedTrips.push(localTrip._id);
            } else {
                noUpdatesNeeded++;
            }
        }
    }

    // Remove from cloud if missing in local (within range)
    for (const atlasTrip of atlasTrips) {
        if (!localTripsMap.has(atlasTrip._id.toString())) {
            // bulkOps.push({
            //     deleteOne: { filter: { _id: atlasTrip._id } }
            // });
            // deletedTrips.push(atlasTrip._id);
        }
    }

    // Step 3: Execute bulk operations
    if (bulkOps.length > 0) {
        // The actual cloud update is intentionally disabled:
        const result = await atlasCollection.bulkWrite(bulkOps);
        console.log(`Bulk sync result: ${result.modifiedCount || 0} updated, ${result.insertedCount || 0} inserted, ${result.deletedCount || 0} deleted.`);
        console.log('Cloud updates are commented out; no changes pushed to Atlas.');
    }

    // Step 4: Log summary
    addLog(`${openedTrips.length} trips inserted to Atlas.`);
    addLog(`${updatedTrips.length} trips updated in Atlas.`);
    addLog(`${deletedTrips.length} trips deleted from Atlas.`);
    addLog(`${noUpdatesNeeded} trips required no updates.`);
    addLog("Trip Data Sync Completed.");
    addLog("---------------------------------------");
}

async function syncTransportGoodsCollection() {
    const localCollection = localClient.db(localDbName).collection('TransportGoodsCollection');
    const atlasCollection = atlasClient.db(atlasTransportDbName).collection('TransportGoods');
    addLog("---------------------------------------");
    addLog("Syncing Transport Goods Data...");

    // 1. Fetch all users from both local and Atlas
    const [localTransportGoods, atlasTransPortGoods] = await Promise.all([
        localCollection.find().toArray(),
        atlasCollection.find().toArray()
    ]);
    const atlasMap = new Map(atlasTransPortGoods.map(v => [v._id.toString(), v]));

    // 2. Prepare bulk operations
    const inserts = [];
    const updates = [];

    for (const localGoods of localTransportGoods) {
        const atlasGoods = atlasMap.get(localGoods._id.toString());
        if (!atlasGoods) {
            inserts.push(localGoods);
        } else {
            // Exists in both, check for changes (compare relevant fields)
            // You can customize which fields to compare
            if (JSON.stringify(localGoods) !== JSON.stringify(atlasGoods)) {
                updates.push({
                    updateOne: {
                        filter: { _id: localGoods._id },
                        update: { $set: localGoods }
                    }
                });
            }
        }
    }

    // 3. Insert new goods to Atlas
    if (inserts.length > 0) {
        await atlasCollection.insertMany(inserts);
        addLog(`Inserted ${inserts.length} new goods to Atlas.`);
    } else {
        addLog('No new goods to insert.');
    }

    // 4. Update changed goods in Atlas
    if (updates.length > 0) {
        await atlasCollection.bulkWrite(updates);
        addLog(`Updated ${updates.length} goods in Atlas.`);
    } else {
        addLog('No goods to update.');
    }

    addLog("Goods Data Sync Completed.");
    addLog("---------------------------------------");
}

async function syncStackHolders() {
    const localCollection = localClient.db(localDbName).collection('TransportStakeholdersCollection');
    const atlasCollection = atlasClient.db(atlasTransportDbName).collection('StackHolders');
    addLog("---------------------------------------");
    addLog("Syncing Stack holders Data...");

    // 1. Fetch all users from both local and Atlas
    const [localStackHolders, atlasStackHolders] = await Promise.all([
        localCollection.find().toArray(),
        atlasCollection.find().toArray()
    ]);
    const atlasMap = new Map(atlasStackHolders.map(v => [v._id.toString(), v]));

    // 2. Prepare bulk operations
    const inserts = [];
    const updates = [];

    for (const localStackHolder of localStackHolders) {
        const atlasGoods = atlasMap.get(localStackHolder._id.toString());
        if (!atlasGoods) {
            inserts.push(localStackHolder);
        } else {
            // Exists in both, check for changes (compare relevant fields)
            // You can customize which fields to compare
            if (JSON.stringify(localStackHolder) !== JSON.stringify(atlasGoods)) {
                updates.push({
                    updateOne: {
                        filter: { _id: localStackHolder._id },
                        update: { $set: localStackHolder }
                    }
                });
            }
        }
    }

    // 3. Insert new users to Atlas
    if (inserts.length > 0) {
        await atlasCollection.insertMany(inserts);
        addLog(`Inserted ${inserts.length} new stackHolders to Atlas.`);
    } else {
        addLog('No new stackHolders to insert.');
    }

    // 4. Update changed users in Atlas
    if (updates.length > 0) {
        await atlasCollection.bulkWrite(updates);
        addLog(`Updated ${updates.length} stackHolders in Atlas.`);
    } else {
        addLog('No stackHolders to update.');
    }

    addLog("StackHolders Data Sync Completed.");
    addLog("---------------------------------------");
}

export async function runSync(logger) {
    try {
        await connectToDatabases();
        setLogger(logger);
        await syncDriversData();
        await syncVechiclesData();
        await syncAttachedVechicles();
        // await syncTripData();
        await syncTrips();
        await syncTransportGoodsCollection();
        await syncStackHolders();
    } catch (error) {
        addLog("Error during sync: " + error, 'ERROR');
        console.error("Error during sync: ", error);
    } finally {
        await closeConnections();
    }
}

export default { runSync };
