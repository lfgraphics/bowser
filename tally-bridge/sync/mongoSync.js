import pkg from 'mongodb';
const { MongoClient } = pkg;
import { config } from 'dotenv';
import { join } from 'path';
import isDev from 'electron-is-dev';
import { addLog } from '../logger.js';

const envPath = isDev ? '.env' : join(process.resourcesPath, 'env.production');

config({ path: envPath });

const localUri = process.env.localUri;
const atlasUri = process.env.atlasUri;
const localDbName = "TransappDataHub";
const localTripCollectionName = "TripDataCollection";
const atlasTransportDbName = "TransportData";
const atlasTripCollectionName = "VehiclesCollection";

const now = new Date();
const past30Days = new Date(now);
const past6Months = new Date(now);
past30Days.setDate(now.getDate() - 65);
past6Months.setMonth(now.getMonth() - 6);

const localTripFilter = {
    $or: [
        {
            $and: [
                { $or: [{ "TallyLoadDetail.UnloadingDate": { $exists: false } }, { "TallyLoadDetail.UnloadingDate": { $ne: null } }] },
                { "EndDate": { $exists: false } },
                { "TallyLoadDetail.LoadingDate": { $gte: past30Days, $lte: now } },
                { "TallyLoadDetail.Goods": { $ne: "HSD" } }
            ]
        },
        { 'EmptyTripDetail.ProposedDate': { $gte: past30Days, $lte: now } },
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
    if (!localClient || !localClient.topology || !localClient.topology.isConnected()) {
        localClient = new MongoClient(localUri, { useUnifiedTopology: true });
        await localClient.connect();
        addLog("Connected to local DB Successfully");
    } else {
        addLog("Reusing existing Local DB connection.");
    }

    if (!atlasClient || !atlasClient.topology || !atlasClient.topology.isConnected()) {
        atlasClient = new MongoClient(atlasUri, { useUnifiedTopology: true });
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
    const localCollection = localClient.db('TransappDataHub').collection('VehicleDriverCollection');
    const atlasCollection = atlasClient.db('TransportData').collection('DriversCollection');

    addLog("---------------------------------------");
    addLog("Syncing Drivers Data...");

    // Step 1: Fetch all data from Atlas and Local
    let atlasData = await atlasCollection.find(
        { Name: { $regex: 'ITPL', $options: 'i' } }
    ).toArray();
    let localData = await localCollection.find(
        { Name: { $regex: 'ITPL', $options: 'i' } }
    ).toArray();

    // Deduplicate by ITPLID (or change to another unique field if needed)
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

    console.log("Fetched drivers data from Atlas: " + atlasData.length + " documents.");
    console.log("Fetched drivers data from Local:" + localData.length + " documents.");

    const atlasDataMap = new Map(atlasData.map(doc => [doc._id.toString(), doc]));

    const newDocumentsToAtlas = [];
    const updateMobileInLocal = [];
    const updateMobileInAtlas = [];

    // Step 3: Iterate over Local Data to find new or mismatched data
    for (const localDoc of localData) {
        const atlasDoc = atlasDataMap.get(localDoc._id.toString());

        if (!atlasDoc) {
            // Document exists in Local but not in Atlas, add to newDocumentsToAtlas
            newDocumentsToAtlas.push(localDoc);
        } else {
            // Compare MobileNo fields
            if (Array.isArray(localDoc.MobileNo) && Array.isArray(atlasDoc.MobileNo)) {
                const localMobileNos = localDoc.MobileNo.filter(num => num && num.MobileNo);
                const atlasMobileNos = atlasDoc.MobileNo.filter(num => num && num.MobileNo);

                if (localMobileNos.length === 0 && atlasMobileNos.length > 0) {
                    // Atlas has MobileNo, but Local is empty or null, update Local
                    updateMobileInLocal.push({ _id: localDoc._id, MobileNo: atlasMobileNos });
                } else if (atlasMobileNos.length === 0 && localMobileNos.length > 0) {
                    // Local has MobileNo, but Atlas is empty or null, update Atlas
                    updateMobileInAtlas.push({ _id: atlasDoc._id, MobileNo: localMobileNos });
                }
            }
        }
    }

    // Step 4: Insert new documents to Atlas in bulk if there are any
    if (newDocumentsToAtlas.length > 0) {
        await atlasCollection.insertMany(newDocumentsToAtlas);
        addLog(`Inserted ${newDocumentsToAtlas.length} new Drivers to Atlas.`);
    } else { addLog('Nothing to add in atlas') }

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
        localCollection.find(localTripFilter, {
            projection: { _id: 1, VehicleNo: 1, LoadStatus: 1, StartDriver: 1, StartDate: 1, StartFrom: 1, EndTo: 1, 'TallyLoadDetail.TripId': 1, 'TallyLoadDetail.Goods': 1, 'EmptyTripDetail.ProposedDate': 1 },
        }).toArray(),
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
        atlasCollection.find().toArray(),
        localCollection.find({ StartDate: { $gte: past6Months, $lte: now } }).toArray(),
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
        if (!atlasTrip) {
            // Not in Atlas, insert
            bulkOps.push({
                insertOne: { document: localTrip }
            });
            openedTrips.push(localTrip._id);
        } else {
            if (JSON.stringify(localTrip) !== JSON.stringify(atlasTrip)) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: localTrip._id },
                        update: { $set: localTrip }
                    }
                });
                updatedTrips.push(localTrip._id);
            } else {
                noUpdatesNeeded++;
            }
        }
    }

    // Remove from cloud if missing in local (within range)
    for (const atlasTrip of atlasTrips) {
        if (!localTripsMap.has(atlasTrip._id.toString())) {
            bulkOps.push({
                deleteOne: { filter: { _id: atlasTrip._id } }
            });
            deletedTrips.push(atlasTrip._id);
        }
    }

    // Step 3: Execute bulk operations
    if (bulkOps.length > 0) {
        const result = await atlasCollection.bulkWrite(bulkOps);
        console.log(`Bulk sync result: ${result.modifiedCount || 0} updated, ${result.insertedCount || 0} inserted, ${result.deletedCount || 0} deleted.`);
    }

    // Step 4: Log summary
    addLog(`${openedTrips.length} trips inserted to Atlas.`);
    addLog(`${updatedTrips.length} trips updated in Atlas.`);
    addLog(`${deletedTrips.length} trips deleted from Atlas.`);
    addLog(`${noUpdatesNeeded} trips required no updates.`);
    addLog("Trip Data Sync Completed.");
    addLog("---------------------------------------");
}

async function syncTransAppUsers() {
    const localCollection = localClient.db(localDbName).collection('UserCollection');
    const atlasCollection = atlasClient.db(atlasTransportDbName).collection('TransAppUsers');
    addLog("---------------------------------------");
    addLog("Syncing TransApp Users Data...");

    // 1. Fetch all users from both local and Atlas
    const [localUsers, atlasUsers] = await Promise.all([
        localCollection.find().toArray(),
        atlasCollection.find().toArray()
    ]);
    const atlasMap = new Map(atlasUsers.map(u => [u._id.toString(), u]));

    // 2. Prepare bulk operations
    const inserts = [];
    const updates = [];

    for (const localUser of localUsers) {
        const atlasUser = atlasMap.get(localUser._id.toString());
        if (!atlasUser) {
            // Not in Atlas, insert
            inserts.push(localUser);
        } else {
            // Exists in both, check for changes (compare relevant fields)
            // You can customize which fields to compare
            if (
                localUser.UserName !== atlasUser.UserName ||
                localUser.Password !== atlasUser.Password ||
                localUser.Division !== atlasUser.Division ||
                JSON.stringify(localUser.myVehicles) !== JSON.stringify(atlasUser.myVehicles)
            ) {
                updates.push({
                    updateOne: {
                        filter: { _id: localUser._id },
                        update: { $set: localUser }
                    }
                });
            }
        }
    }

    // 3. Insert new users to Atlas
    if (inserts.length > 0) {
        await atlasCollection.insertMany(inserts);
        addLog(`Inserted ${inserts.length} new users to Atlas.`);
    } else {
        addLog('No new users to insert.');
    }

    // 4. Update changed users in Atlas
    if (updates.length > 0) {
        await atlasCollection.bulkWrite(updates);
        addLog(`Updated ${updates.length} users in Atlas.`);
    } else {
        addLog('No users to update.');
    }

    addLog("TransApp Users Data Sync Completed.");
    addLog("---------------------------------------");
}

async function syncDeactivatedVehicles() {
    const localCollection = localClient.db(localDbName).collection('TransMongoDeactivatedVehicleCollection');
    const atlasCollection = atlasClient.db(atlasTransportDbName).collection('DeactivatedVehicles');
    addLog("---------------------------------------");
    addLog("Syncing Deactivated Vehicles Data...");

    // 1. Fetch all users from both local and Atlas
    const [localDeactivatedVehicles, atlasDeactivatedVehicles] = await Promise.all([
        localCollection.find().toArray(),
        atlasCollection.find().toArray()
    ]);
    const atlasMap = new Map(atlasDeactivatedVehicles.map(v => [v._id.toString(), v]));

    // 2. Prepare bulk operations
    const inserts = [];
    const updates = [];

    for (const localVehicle of localDeactivatedVehicles) {
        const atlasVehicle = atlasMap.get(localVehicle._id.toString());
        if (!atlasVehicle) {
            // Not in Atlas, insert
            inserts.push(localVehicle);
        } else {
            // Exists in both, check for changes (compare relevant fields)
            // You can customize which fields to compare
            if (JSON.stringify(localVehicle) !== JSON.stringify(atlasVehicle)) {
                updates.push({
                    updateOne: {
                        filter: { _id: localVehicle._id },
                        update: { $set: localVehicle }
                    }
                });
            }
        }
    }

    // 3. Insert new users to Atlas
    if (inserts.length > 0) {
        await atlasCollection.insertMany(inserts);
        addLog(`Inserted ${inserts.length} new deactive vehicle to Atlas.`);
    } else {
        addLog('No new users to insert.');
    }

    // 4. Update changed users in Atlas
    if (updates.length > 0) {
        await atlasCollection.bulkWrite(updates);
        addLog(`Updated ${updates.length} deactive vehicle in Atlas.`);
    } else {
        addLog('No vehicles to update.');
    }

    addLog("Deactive vehicles Data Sync Completed.");
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

    // 3. Insert new users to Atlas
    if (inserts.length > 0) {
        await atlasCollection.insertMany(inserts);
        addLog(`Inserted ${inserts.length} new deactive vehicle to Atlas.`);
    } else {
        addLog('No new users to insert.');
    }

    // 4. Update changed users in Atlas
    if (updates.length > 0) {
        await atlasCollection.bulkWrite(updates);
        addLog(`Updated ${updates.length} deactive vehicle in Atlas.`);
    } else {
        addLog('No vehicles to update.');
    }

    addLog("Deactive vehicles Data Sync Completed.");
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
        addLog(`Inserted ${inserts.length} new deactive vehicle to Atlas.`);
    } else {
        addLog('No new users to insert.');
    }

    // 4. Update changed users in Atlas
    if (updates.length > 0) {
        await atlasCollection.bulkWrite(updates);
        addLog(`Updated ${updates.length} deactive vehicle in Atlas.`);
    } else {
        addLog('No vehicles to update.');
    }

    addLog("Deactive vehicles Data Sync Completed.");
    addLog("---------------------------------------");
}

export async function runSync(logger) {
    try {
        await connectToDatabases();
        setLogger(logger);
        await syncDriversData();
        await syncVechiclesData();
        await syncAttachedVechicles();
        await syncTripData();
        await syncTrips();
        await syncTransAppUsers();
        await syncDeactivatedVehicles();
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
