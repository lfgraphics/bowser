const { MongoClient } = require('mongodb');
require('dotenv').config();
// Variables defination
// trip
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
    { $or: [{ "EndDate": { $exists: false } }] },
    { "TallyLoadDetail.LoadingDate": { $gte: past30Days, $lte: now } },
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
async function syncDriversData() {
  const localCollection = localClient.db('TransappDataHub').collection('VehicleDriverCollection');
  const atlasCollection = atlasClient.db('TransportData').collection('DriversCollection');

  // Step 1: Fetch all data from Atlas and Local
  const atlasData = await atlasCollection.find().toArray();
  console.log("Fetched drivers data from Atlas:", atlasData.length, "documents.");

  const atlasDataMap = new Map(atlasData.map(doc => [doc._id.toString(), doc]));

  const localData = await localCollection.find({ Name: { $regex: 'ITPL', $options: 'i' } }, { projection: { _id: 1, Name: 1, ITPLID: 1, MobileNo: 1 } }).toArray();
  console.log("Fetched drivers data from Local:", localData.length, "documents.");

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

  const localData = await localCollection.find({ AssetsType: { $regex: 'Own', $options: 'i' } }, { projection: { _id: 1, VehicleNo: 1 } }).toArray();
  console.log("Fetched vehicles data from Local:", localData.length, "documents.");

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

async function syncTripData() {
  const localCollection = localClient.db(localDbName).collection(localTripCollectionName);
  const atlasCollection = atlasClient.db(atlasTransportDbName).collection(atlasTripCollectionName);

  let openedTrips = [];
  let updatedTrips = [];
  let closedTrips = [];
  let noUpdatesNeeded = 0;

  // Step 1: Fetch all vehicle data from Atlas
  const atlasVehicles = await atlasCollection.find().toArray();
  console.log(`Fetched ${atlasVehicles.length} vehicles from Atlas.`);

  // Step 2: Fetch filtered trip data from Local
  const localTrips = await localCollection.find(localTripFilter, {
    projection: { _id: 1, VehicleNo: 1, StartDriver: 1, StartDate: 1 },
  }).toArray();
  console.log(`Fetched ${localTrips.length} trips from Local.`);

  for (const vehicle of atlasVehicles) {
    const matchingTrips = localTrips.filter(trip => trip.VehicleNo === vehicle.VehicleNo);

    if (matchingTrips.length > 0) {
      // Step 3: Handle multiple open trips by sorting and picking the latest
      const sortedTrips = matchingTrips.sort((a, b) => new Date(b.StartDate) - new Date(a.StartDate));
      const latestTrip = sortedTrips[0];

      const driverIdFromTrip = latestTrip.StartDriver; // StartDriver field

      // Regex to match both "ITPL" IDs and numeric-only IDs
      const driverMatch = driverIdFromTrip.match(
        /(.*?)(?:\s*[-(]?\s*(ITPL\d+|\d+)[)-]?)$/i
      );

      let tripDetails;

      if (driverMatch) {
        // Extracted Name and ID
        const driverName = driverMatch[1].trim();
        const id = driverMatch[2]?.toUpperCase();

        tripDetails = {
          id: latestTrip._id, // Local trip ID
          driver: {
            id: id, // Extracted ID
            Name: driverName, // Extracted driver name
            MobileNo: null, // Leave MobileNo blank
          },
          open: true, // Trip is open
        };
      } else {
        // No valid ID found: Use StartDriver as the Name and omit the ID
        tripDetails = {
          id: latestTrip._id, // Local trip ID
          driver: {
            Name: driverIdFromTrip, // Use full StartDriver value
            MobileNo: null, // Leave MobileNo blank
          },
          open: true, // Trip is open
        };
      }

      // Check if the trip details already match the new data
      const currentTripDetails = vehicle.tripDetails || {};
      const isTripDetailsSame =
        currentTripDetails.open === tripDetails.open &&
        currentTripDetails.driver?.id === tripDetails.driver?.id &&
        currentTripDetails.driver?.Name === tripDetails.driver.Name;

      if (isTripDetailsSame) {
        noUpdatesNeeded++;
        continue; // Skip updates if details are identical
      }

      // Update the trip details
      try {
        await atlasCollection.updateOne(
          { _id: vehicle._id },
          { $set: { tripDetails } }
        );
        if (!currentTripDetails.open && tripDetails.open) {
          openedTrips.push(vehicle.VehicleNo); // Log trips opened
        } else {
          updatedTrips.push(vehicle.VehicleNo); // Log trips with updated details
        }
      } catch (error) {
        console.log(`Error updating vehicle ${vehicle.VehicleNo}:`, error);
      }
    } else {
      // No open trips found or trip is closed
      if (vehicle.tripDetails?.open) {
        try {
          await atlasCollection.updateOne(
            { _id: vehicle._id },
            { $set: { "tripDetails.open": false } }
          );
          closedTrips.push(vehicle.VehicleNo); // Log trips closed
        } catch (error) {
          console.log(`Error closing trip for vehicle ${vehicle.VehicleNo}:`, error);
        }
      } else {
        noUpdatesNeeded++;
      }
    }
  }

  // Log summary of changes
  console.log(`${openedTrips.length} trips opened.`);
  console.log(`${updatedTrips.length} vehicles updated with new trip details.`);
  console.log(`${closedTrips.length} trips closed.`);
  if (noUpdatesNeeded > 0) {
    console.log(`${noUpdatesNeeded} vehicles required no updates.`);
  }
}

async function cleanUpVehicleDriverCollection() {
  const localCollection = localClient.db('TransappDataHub').collection('VehicleDriverCollection');
  const tempCollection = localClient.db('TransappDataHub').collection('VehicleDriverCollection_temp');

  try {
    // Run the aggregation pipeline
    const result = await localCollection.aggregate([
      {
        $group: {
          _id: "$Name",
          docs: { $push: "$$ROOT" } // Collect all documents with the same Name
        }
      },
      {
        $project: {
          docToKeep: {
            $let: {
              vars: {
                filteredDocs: {
                  $filter: {
                    input: "$docs",
                    as: "doc",
                    cond: {
                      $or: [
                        {
                          $gt: [
                            {
                              $size: {
                                $ifNull: [
                                  {
                                    $cond: {
                                      if: { $isArray: "$$doc.MobileNo" },
                                      then: "$$doc.MobileNo",
                                      else: [{ $ifNull: ["$$doc.MobileNo", {}] }] // Ensure that a non-array MobileNo is wrapped in an array
                                    }
                                  },
                                  []
                                ]
                              }
                            },
                            0
                          ]
                        }, // Ensure MobileNo is an array
                        { $ne: ["$$doc.ITPLId", null] } // ITPLId is not null
                      ]
                    }
                  }
                }
              },
              in: {
                $cond: {
                  if: { $gt: [{ $size: "$$filteredDocs" }, 0] },
                  then: { $arrayElemAt: ["$$filteredDocs", 0] },
                  else: { $arrayElemAt: ["$docs", 0] }
                }
              }
            }
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: "$docToKeep"
        }
      }
    ]).toArray();

    // Insert the filtered documents into the temporary collection
    if (result.length > 0) {
      await tempCollection.insertMany(result);
      console.log("Filtered documents inserted into temporary collection.");
    }

    // Replace the original collection with the temporary collection
    await localCollection.deleteMany({});
    await localCollection.insertMany(await tempCollection.find().toArray());
    console.log("Original collection replaced with filtered documents.");

    // Drop the temporary collection
    await tempCollection.drop();
    console.log("Temporary collection dropped.");
  } catch (err) {
    console.error("Error running the cleanup task:", err);
  }
}


// Functions calls
async function main() {
  await connectToDatabases(); // Establish connections

  try {
    // await cleanUpVehicleDriverCollection()
    // console.log("Sync operation completed:", tripSyncResult);
    await syncDriversData(); //const driverSyncResult = 
    await syncVechiclesData(); //const vehicleSyncResult = 
    await syncTripData(); //const tripSyncResult = 
    // deleteOtherFieldsInAtlas()
  } catch (error) {
    console.error("Sync operation failed:", error);
  } finally {
    await closeConnections(); // Close connections at the end
  }
}

main();
