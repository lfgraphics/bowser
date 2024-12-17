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
  const atlasData = await atlasCollection.find(
    { Name: { $regex: 'ITPL', $options: 'i' } },
    { projection: { _id: 1, Name: 1, ITPLID: 1, MobileNo: 1 } }
  ).toArray();
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

async function syncAttachedVechicles() {
  const localCollection = localClient.db('TransappDataHub').collection('VehicleCollection');
  const atlasCollection = atlasClient.db('TransportData').collection('AttatchedVehiclesCollection');

  // Step 1: Fetch all data from Atlas and Local
  const atlasData = await atlasCollection.find().toArray();
  console.log("Fetched Attached vehicles data from Atlas:", atlasData.length, "documents.");

  const atlasDataMap = new Map(atlasData.map(doc => [doc._id.toString(), doc]));

  const localData = await localCollection.find({ AssetsType: { $regex: 'Attached', $options: 'i' } }, { projection: { _id: 1, VehicleNo: 1, TransportPartenName: 1 } }).toArray();
  console.log("Fetched Attached vehicles data from Local:", localData.length, "documents.");

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

  const openedTrips = [];
  const updatedTrips = [];
  const closedTrips = [];
  let noUpdatesNeeded = 0;

  // Step 1: Fetch data from Local and Atlas
  const [atlasVehicles, localTrips] = await Promise.all([
    atlasCollection.find().toArray(),
    localCollection.find(localTripFilter, {
      projection: { _id: 1, VehicleNo: 1, StartDriver: 1, StartDate: 1 },
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
        id: latestTrip._id,               // Set trip ID
        driver: latestTrip.StartDriver,   // Set StartDriver directly as a string
        open: true                        // Trip is open
      };

      // Skip update if tripDetails.id matches current tripDetails.id
      if (vehicle.tripDetails?.id?.toString() === latestTrip._id.toString()) {
        noUpdatesNeeded++;
        continue;
      }

      // Update the tripDetails, preserve existing MobileNo
      bulkOps.push({
        updateOne: {
          filter: { _id: vehicle._id },
          update: {
            $set: {
              tripDetails: {
                ...tripDetails,
                driver: latestTrip.StartDriver, // Simplified driver field
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
  console.log(`${updatedTrips.length} vehicles updated.`);
  console.log(`${closedTrips.length} trips closed.`);
  console.log(`${noUpdatesNeeded} vehicles required no updates.`);
}

// async function cleanUpVehicleDriverCollection() {
//   const localCollection = atlasClient.db('TransappData').collection('DriversCollection');
//   const tempCollection = localClient.db('TransappDataHub').collection('VehicleDriverCollection_temp');

//   try {
//     // Run the aggregation pipeline
//     const result = await localCollection.aggregate([
//       {
//         $group: {
//           _id: "$Name",
//           docs: { $push: "$$ROOT" } // Collect all documents with the same Name
//         }
//       },
//       {
//         $project: {
//           docToKeep: {
//             $let: {
//               vars: {
//                 filteredDocs: {
//                   $filter: {
//                     input: "$docs",
//                     as: "doc",
//                     cond: {
//                       $or: [
//                         {
//                           $gt: [
//                             {
//                               $size: {
//                                 $ifNull: [
//                                   {
//                                     $cond: {
//                                       if: { $isArray: "$$doc.MobileNo" },
//                                       then: "$$doc.MobileNo",
//                                       else: [{ $ifNull: ["$$doc.MobileNo", {}] }] // Ensure that a non-array MobileNo is wrapped in an array
//                                     }
//                                   },
//                                   []
//                                 ]
//                               }
//                             },
//                             0
//                           ]
//                         }, // Ensure MobileNo is an array
//                         { $ne: ["$$doc.ITPLId", null] } // ITPLId is not null
//                       ]
//                     }
//                   }
//                 }
//               },
//               in: {
//                 $cond: {
//                   if: { $gt: [{ $size: "$$filteredDocs" }, 0] },
//                   then: { $arrayElemAt: ["$$filteredDocs", 0] },
//                   else: { $arrayElemAt: ["$docs", 0] }
//                 }
//               }
//             }
//           }
//         }
//       },
//       {
//         $replaceRoot: {
//           newRoot: "$docToKeep"
//         }
//       }
//     ]).toArray();

//     // Insert the filtered documents into the temporary collection
//     if (result.length > 0) {
//       await tempCollection.insertMany(result);
//       console.log("Filtered documents inserted into temporary collection.");

//       // Replace the original collection with the temporary collection
//       await localCollection.deleteMany({});
//       const tempDocs = await tempCollection.find().toArray();
//       if (tempDocs.length > 0) {
//         await localCollection.insertMany(tempDocs);
//         console.log("Original collection replaced with filtered documents.");
//       } else {
//         console.log("No documents to replace original collection with.");
//       }

//       // Drop the temporary collection
//       await tempCollection.drop();
//       console.log("Temporary collection dropped.");
//     } else {
//       console.log("No documents returned from aggregation. Skipping insert.");
//     }
//   } catch (err) {
//     console.error("Error running the cleanup task:", err);
//   }
// }


// Functions calls
async function main() {
  await connectToDatabases();

  try {
    while (true) {
      const now = new Date();
      const currentHour = now.getHours();

      // Check if the current time falls within the allowed range
      if (currentHour >= 9 && currentHour <= 23 && (currentHour - 9) % 1 === 0) {
        console.log(`Starting sync operations at ${now.toLocaleTimeString()}`);

        // Individual try-catch for each function to ensure all operations log errors separately
        try {
          console.log("------------Syncing driver data...------------");
          await syncDriversData();
          console.log("------------Driver data sync completed successfully.------------");
        } catch (error) {
          console.error("~~~~~~~~~~~~~~~Error syncing driver data:", error);
        }

        try {
          console.log("------------Syncing vehicle data...------------");
          await syncVechiclesData();
          console.log("------------Vehicle data sync completed successfully.------------");
        } catch (error) {
          console.error("~~~~~~~~~~~~~~~Error syncing vehicle data:", error);
        }
        try {
          console.log("------------Syncing Attached vehicle data...------------");
          await syncAttachedVechicles();
          console.log("------------Attached Vehicle data sync completed successfully.------------");
        } catch (error) {
          console.error("~~~~~~~~~~~~~~~Error syncing Attached vehicle data:", error);
        }

        try {
          console.log("------------Syncing trip data...------------");
          await syncTripData();
          console.log("------------Trip data sync completed successfully.------------");
        } catch (error) {
          console.error("~~~~~~~~~~~~~~~Error syncing trip data:", error);
        }

        console.log(`..................Sync operations completed at ${new Date().toLocaleTimeString()}..................`);

        // Wait until the next 2-hour window
        const nextHour = currentHour + 2;
        const nextRun = new Date(now);
        nextRun.setHours(nextHour, 0, 0, 0);
        const waitTime = nextRun - new Date();
        console.log(`Waiting until ${nextRun.toLocaleTimeString()} for the next run.\n\n\n`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // Calculate the next valid sync time
        const nextValidHour = currentHour < 9 ? 9 : Math.ceil((currentHour - 9) / 2) * 2 + 9;
        let nextRun = new Date(now);

        if (nextValidHour > 23) {
          // Next valid sync time is tomorrow at 9:00 AM
          nextRun.setDate(nextRun.getDate() + 1);
          nextRun.setHours(9, 0, 0, 0);
        } else {
          // Next valid sync time is later today
          nextRun.setHours(nextValidHour, 0, 0, 0);
        }

        const waitTime = nextRun - new Date();
        console.log(`Not in sync window (${now.toLocaleTimeString()}). Waiting until ${nextRun.toLocaleTimeString()}.\n\n\n`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  } catch (error) {
    console.error("An error occurred in the main loop:", error);
  } finally {
    await closeConnections();
    console.log("Connections closed. Exiting script.");
  }
}

main();
