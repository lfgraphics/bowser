const { MongoClient } = require('mongodb');
require('dotenv').config();
// Variables defination
// trip
const localUri = process.env.localUri;
const atlasUri = process.env.atlasUri;
const localDbName = "TransappDataHub";
const localTripCollectionName = "TripDataCollection";
const atlasTransportDbName = "TransportData";
const atlasTripCollectionName = "TripDataCollection";
const localTripFilter = {
  $and: [
    { $or: [{ "TallyLoadDetail.UnloadingDate": { $exists: false } }, { "TallyLoadDetail.UnloadingDate": null }] },
    { "EndDate": { $exists: false } },
    { "TallyLoadDetail.LoadingDate": { $gte: new Date("2024-07-01T00:00:00Z") } },
    { "TallyLoadDetail.Goods": { $ne: "HSD" } }
  ]
};

// Global variables for clients
let localClient;
let atlasClient;

// Function to establish connections
async function connectToDatabases() {
  localClient = new MongoClient(localUri);
  atlasClient = new MongoClient(atlasUri);

  await localClient.connect().then(console.log("Connected to local DB Successfully"));
  await atlasClient.connect().then(console.log("Connected to Atlas DB Successfully"));
}

// Function to close connections
async function closeConnections() {
  await localClient.close();
  await atlasClient.close();
}

// Client functions defination
// trip
async function syncTripData() {
  const localCollection = localClient.db(localDbName).collection(localTripCollectionName);
  const atlasCollection = atlasClient.db(atlasTransportDbName).collection(atlasTripCollectionName);

  // Step 1: Fetch all data from Atlas
  const atlasData = await atlasCollection.find().toArray();
  console.log("Fetched trips data from Atlas:", atlasData.length, "documents.");

  const atlasIds = atlasData.map(doc => doc._id.toString());

  // Step 2: Fetch local data with specific filter (documents without EndDate or UnloadingDate)
  const localData = await localCollection.find(localTripFilter, { projection: { StartDriver: 1, VehicleNo: 1, _id: 1, 'TallyLoadDetail.UnloadingDate': 1, 'TallyLoadDetail.LoadingDate': 1, EndDate: 1, 'TallyLoadDetail.Goods': 1 } }).toArray();
  console.log("Fetched trips data from local:", localData.length, "documents.");

  // Step 3: Identify documents in local with EndDate or UnloadingDate to remove from Atlas
  const docsToRemoveFromLocal = localData.filter(localDoc => localDoc.EndDate || localDoc.TallyLoadDetail.UnloadingDate);
  const removeIdsFromLocal = docsToRemoveFromLocal.map(doc => doc._id.toString());

  // Identify documents to remove from Atlas (documents not in local data or in local with EndDate/UnloadingDate)
  const docsToRemove = atlasData.filter(atlasDoc => {
    const localDocExists = localData.some(localDoc => localDoc._id.toString() === atlasDoc._id.toString());
    return !localDocExists || removeIdsFromLocal.includes(atlasDoc._id.toString());
  });
  const removeIds = docsToRemove.map(doc => doc._id);

  // Step 4: Identify documents to add to Atlas (in local, meeting criteria, but not in Atlas)
  const docsToAdd = localData
    .filter(localDoc => !atlasIds.includes(localDoc._id.toString()))
    .map(({ StartDriver, VehicleNo, _id }) => ({ StartDriver, VehicleNo, _id })); // Only include specified fields

  // Perform the operations on Atlas
  // Step 5: Perform the operations on Atlas
  let deleteResult
  if (removeIds.length > 0) {
    deleteResult = await atlasCollection.deleteMany({ _id: { $in: removeIds } });
    console.log(`Deleted ${deleteResult?.deletedCount} documents from Atlas.`);
  } else {
    console.log("Nothing to delete from Atlas.");
  }

  let insertResult
  if (docsToAdd.length > 0) {
    insertResult = await atlasCollection.insertMany(docsToAdd);
    console.log(`Inserted ${insertResult?.insertedCount} new documents into Atlas.`);
  } else {
    console.log("Nothing to add to Atlas.");
  }

  // Return the results of the sync operation
  deleteResult?.deletedCount !== undefined && console.log(`Deleted ${deleteResult.deletedCount} documents from Atlas.`);
  insertResult?.insertedCount !== undefined && console.log(`Inserted ${insertResult.insertedCount} new documents into Atlas.`);
  return {
    deletedCount: deleteResult?.deletedCount !== undefined ? deleteResult.deletedCount : 0,
    insertedCount: insertResult?.insertedCount !== undefined ? insertResult.insertedCount : 0
  };
}

async function syncDriversData() {
  const localCollection = localClient.db('TransappDataHub').collection('VehicleDriverCollection');
  const atlasCollection = atlasClient.db('TransportData').collection('DriversCollection');

  // Step 1: Fetch all data from Atlas and Local
  const atlasData = await atlasCollection.find().toArray();
  console.log("Fetched drivers data from Atlas:", atlasData.length, "documents.");

  const atlasDataMap = new Map(atlasData.map(doc => [doc._id.toString(), doc]));

  const localData = await localCollection.find({ Name: { $regex: 'ITPL', $options: 'i' } }, { projection: { _id: 1, Name: 1, ITPLID: 1, MobileNo: 1 } }).toArray();
  console.log("Fetched drivers data from Local:", localData.length, "documents.");

  const localDataMap = new Map(localData.map(doc => [doc._id.toString(), doc]));

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
    console.log(`Inserted ${newDocumentsToAtlas.length} new documents to Atlas.`);
  } else { console.log('Nothing to add in atlas') }

  // Step 5: Update Local MobileNos in bulk if there are any
  if (updateMobileInLocal.length > 0) {
    const bulkOps = updateMobileInLocal.map(doc => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { MobileNo: doc.MobileNo } }
      }
    }));
    await localCollection.bulkWrite(bulkOps);
    console.log(`Updated MobileNo for ${updateMobileInLocal.length} documents in Local.`);
  } else { console.log('Nothing to update in local') }

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
  } else { console.log('Nothing to update in atlas') }
}

async function syncVechiclesData() {
  const localCollection = localClient.db('TransappDataHub').collection('VehicleCollection');
  const atlasCollection = atlasClient.db('TransportData').collection('VehiclesCollection');

  // Step 1: Fetch all data from Atlas and Local
  const atlasData = await atlasCollection.find().toArray();
  console.log("Fetched vehicles data from Atlas:", atlasData.length, "documents.");

  const atlasDataMap = new Map(atlasData.map(doc => [doc._id.toString(), doc]));

  const localData = await localCollection.find({ AssetsType: { $regex: 'Own', $options: 'i' } }, { projection: { _id: 1, VehicleNo: 1, AssetsType: 1 } }).toArray();
  console.log("Fetched vehicles data from Local:", localData.length, "documents.");

  const localDataMap = new Map(localData.map(doc => [doc._id.toString(), doc]));

  // Step 2: Prepare new documents to insert into Atlas
  const newDocumentsToAtlas = [];

  for (const localDoc of localData) {
    if (!atlasDataMap.has(localDoc._id.toString())) {
      // Document exists in Local but not in Atlas, add to newDocumentsToAtlas
      newDocumentsToAtlas.push(localDoc);
    }
  }

  // Step 3: Insert new documents to Atlas in bulk if there are any
  if (newDocumentsToAtlas.length > 0) {
    await atlasCollection.insertMany(newDocumentsToAtlas);
    console.log(`Inserted ${newDocumentsToAtlas.length} new documents to Atlas.`);
  } else {
    console.log('Nothing new to sync')
  }
}

// async function deleteOtherFieldsInAtlas() {
//   const atlasCollection = atlasClient.db('TransportData').collection('VehiclesCollection');
//   const documents = await atlasCollection.find({}, { projection: { _id: 1, VehicleNo: 1, AssetsType: 1 } }).toArray();

//   const bulkOps = documents.map(doc => ({
//     updateOne: {
//       filter: { _id: doc._id },
//       update: { $set: { VehicleNo: doc.VehicleNo, AssetsType: doc.AssetsType }, $unset: Object.keys(doc).filter(key => !['_id', 'VehicleNo', 'AssetsType'].includes(key)).reduce((acc, key) => { acc[key] = ''; return acc; }, {}) }
//     }
//   }));

//   console.log(bulkOps.length)

//   // if (bulkOps.length > 0) {
//   //   await localCollection.bulkWrite(bulkOps);
//   //   console.log(`Updated ${bulkOps.length} documents in Local to delete all other fields except _id, VehicleNo, and AssetsType.`);
//   // }
// }

// Functions calls
async function main() {
  await connectToDatabases(); // Establish connections

  try {
    await syncTripData(); //const tripSyncResult = 
    // console.log("Sync operation completed:", tripSyncResult);
    await syncDriversData(); //const driverSyncResult = 
    await syncVechiclesData(); //const vehicleSyncResult = 
    // deleteOtherFieldsInAtlas()
  } catch (error) {
    console.error("Sync operation failed:", error);
  } finally {
    await closeConnections(); // Close connections at the end
  }
}

main();
