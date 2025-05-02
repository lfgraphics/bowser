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
past30Days.setDate(now.getDate() - 65);

const localTripFilter = {
    $and: [
        { $or: [{ "TallyLoadDetail.UnloadingDate": { $exists: false } }, { "TallyLoadDetail.UnloadingDate": { $ne: null } }] },
        { "EndDate": { $exists: false } },
        { "TallyLoadDetail.LoadingDate": { $gte: past30Days, $lte: now } },
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
    await localClient.close();
    await atlasClient.close();
}

// Client functions defination
async function syncDriversData() {
    const localCollection = localClient.db('TransappDataHub').collection('VehicleDriverCollection');
    const atlasCollection = atlasClient.db('TransportData').collection('DriversCollection');

    addLog("---------------------------------------");
    addLog("Syncing Drivers Data...");

    // Step 1: Fetch all data from Atlas and Local
    const atlasData = await atlasCollection.find(
        { Name: { $regex: 'ITPL', $options: 'i' } },
        { projection: { _id: 1, Name: 1, ITPLID: 1, MobileNo: 1 } }
    ).toArray();
    console.log("Fetched drivers data from Atlas: " + atlasData.length + " documents.");
    const atlasDataMap = new Map(atlasData.map(doc => [doc._id.toString(), doc]));

    const localData = await localCollection.find({ Name: { $regex: 'ITPL', $options: 'i' } }, { projection: { _id: 1, Name: 1, ITPLID: 1, MobileNo: 1 } }).toArray();
    console.log("Fetched drivers data from Local:" + localData.length, "documents.");

    // Step 2: Prepare data for insertion and updates
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
    addLog("Syncing Trip Data...");

    const openedTrips = [];
    const updatedTrips = [];
    const closedTrips = [];
    let noUpdatesNeeded = 0;

    // Step 1: Fetch data from Local and Atlas
    const [atlasVehicles, localTrips] = await Promise.all([
        atlasCollection.find().toArray(),
        localCollection.find(localTripFilter, {
            projection: { _id: 1, VehicleNo: 1, StartDriver: 1, StartDate: 1, StartFrom: 1, EndTo: 1, 'TallyLoadDetail.TripId': 1, 'TallyLoadDetail.Goods': 1 },
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
                tripId: latestTrip.TallyLoadDetail.TripId,
                product: latestTrip.TallyLoadDetail.Goods,
                driver: latestTrip.StartDriver,
                open: true,
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

    addLog("Trip Data Sync Completed.");
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
    } catch (error) {
        addLog("Error during sync: " + error.message, 'ERROR');
        console.error("Error during sync: ", error);
    } finally {
        await closeConnections();
    }
}

export default { runSync };
