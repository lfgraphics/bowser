import { findOne as findOneTransUser, find as findTransUsers } from '../../models/TransUser.js';
import TankersTrip, { findOne as findOneTrip, find as findTrips, findById as findTripById, aggregate as aggregateTrips, findByIdAndUpdate as updateTripById } from '../../models/VehiclesTrip.js';
import { find as findDeactivatedVehicles } from '../../models/DeactivatedVehicles.js';
import { find as findVehicles } from '../../models/vehicle.js';
import { mongoose } from 'mongoose';
import { getLatestVehicleUpdates } from '../../utils/vehicles.js';

const division = {
    "0": "Ethanol",
    "1": "Molasses",
    "2": "Petroleum",
    "3": "BMDivision",
    "4": "Management",
    "-1": "Unknown",
    "10": "EthanolAdmin",
    "11": "MolassesAdmin",
    "12": "PetroleumAdmin",
    "13": "BMDivisionAdmin",
    "14": "RTODivision",
}
function getDivisionKeyByValue(value) {
    return Object.keys(division).find(key => division[key] === value);
}

/**
 * Retrieves the most recent trip for a given vehicle number.
 *
 * @async
 * @function
 * @param {string} vehicleNumber - The vehicle number to search trips for.
 * @returns {Promise<Object>} The most recent trip document for the specified vehicle.
 * @throws {Error} If no current trip is found or if fetching fails.
 */
const getCurrentTrip = async (vehicleNumber) => {
    try {
        const trip = await findOneTrip({ VehicleNo: vehicleNumber }).sort({ StartDate: -1 }).lean();
        if (!trip) {
            throw new Error('No current trip found for this vehicle.');
        }
        return trip;
    } catch (error) {
        console.error('Error fetching current trip:', error);
        throw new Error('Failed to fetch current trip');
    }
}

const getCurrentTripByDriverId = async (driverId) => {
    try {
        const trip = await findOneTrip({ StartDriver: { $regex: driverId } }).sort({ StartDate: -1 }).lean();
        if (!trip) {
            throw new Error('No current trip found for this vehicle.');
        }
        return trip;
    } catch (error) {
        console.error('Error fetching current trip:', error);
        throw new Error('Failed to fetch current trip');
    }
}
/**
 * Retrieves all the trips for a given vehicle number.
 *
 * @async
 * @function
 * @param {string} vehicleNumber - The vehicle number to search trips for.
 * @returns {Promise<Array>} All trip documents for the specified vehicle.
 * @throws {Error} If no current trip is found or if fetching fails.
 */
const getAllTrips = async (vehicleNumber) => {
    try {
        const trips = await findTrips({ VehicleNo: vehicleNumber });
        return trips;
    } catch (error) {
        console.error('Error fetching trips:', error);
        throw new Error('Failed to fetch trips');
    }
}

const getTripById = async (tripId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(tripId)) {
            throw new Error('Invalid tripId');
        }
        const trip = await findTripById(tripId);
        return trip;
    } catch (error) {
        console.error('Error fetching trip by ID:', error);
        throw new Error('Failed to fetch trip by ID');
    }
}

/**
 * The above functions are used to fetch and process data related to user vehicles, including loaded
 * and unloaded trips, deactivated vehicles, and planned and unplanned trips.
 * @param userId - Thank you for providing the code snippet. It seems like you were about to ask for
 * the parameters needed for the functions. If you can provide me with the specific parameters or any
 * additional context, I'd be happy to assist you further.
 * @returns The functions are querying a database to retrieve information about vehicles related to a
 * specific user. Here is a summary of what each function returns:
 */
async function getUserVehicles(userId) {
    try {
        const user = await findOneTransUser({ _id: userId });
        if (!user) throw new Error('User not found');
        if (user.Division == 4) {
            const divisionVehicles = await findVehicles({}, 'VehicleNo');
            const vehiclesArray = divisionVehicles.map((vehicle) => vehicle.VehicleNo)
            return vehiclesArray || []
        } else if (user.Division >= 10) {
            let adminDivisionName = division[user.Division]
            let divisionName = adminDivisionName?.replace('Admin', "")
            let divisionKey = getDivisionKeyByValue(divisionName)
            const divisionUsers = await findTransUsers({ Division: divisionKey }, 'myVehicles')
            const vehiclesArray = divisionUsers.map(user => user.myVehicles || []).flat();
            return vehiclesArray || []
        } else {
            return user.myVehicles || [];
        }
    } catch (error) {
        console.error('Error fetching user vehicles:', error);
        throw error;
    }
}

const getAllTripsForVehicle = async (vehicleNo) => {
    try {
        const trips = await findTrips({ VehicleNo: vehicleNo })
            .sort({ StartDate: -1, rankindex: 1 })
            .lean();
        return trips;
    } catch (error) {
        console.error('Error fetching trips for vehicle:', error);
        throw new Error('Failed to fetch trips for vehicle');
    }
}

/**
 * The function `getUsersDeactivatedVehicles` retrieves a list of deactivated vehicles associated with
 * a user based on their ID.
 * @param userId - The `userId` parameter is used to identify a specific user for whom we want to
 * retrieve a list of deactivated vehicles.
 * @returns The function `getUsersDeactivatedVehicles` returns a list of vehicle numbers for vehicles
 * that are deactivated and associated with a specific user. The list is obtained by querying the
 * database for deactivated vehicles that were created by the user with the provided `userId`, and
 * whose vehicle numbers are included in the user's list of vehicles.
 */
async function getUsersDeactivatedVehicles(userId) {
    try {
        const user = await findOneTransUser({ _id: userId });
        const userVehicles = user.myVehicles || [];
        const userName = user.UserName;
        const deactivatedVehiclesList = await findDeactivatedVehicles({ 'UserInfo.CreatedBy': userName, VehicleNo: { $in: userVehicles } });
        return deactivatedVehiclesList.map(vehicle => vehicle.VehicleNo);
    } catch (error) {
        console.error('Error fetching deactivated vehicles:', error);
        throw error;
    }
}

/**
 * The function `getLoadedNotUnloadedVehicles` retrieves active loaded vehicles that have not been
 * unloaded for a specific user.
 * @param userId - The `getLoadedNotUnloadedVehicles` function is an asynchronous function that
 * retrieves information about vehicles that are loaded but not yet unloaded for a specific user
 * identified by their `userId`.
 * @returns The function `getLoadedNotUnloadedVehicles` returns a list of TankersTrip documents that
 * meet the following criteria:
 * 1. The `VehicleNo` of the trip is in the list of `vehicleNos` obtained from the user's vehicles and
 * not in the list of `deactivatedVehicles`.
 * 2. The `LoadStatus` of the trip is 1.
 * 3. The `
 */
async function getLoadedNotUnloadedVehicles(userId) {
    // Reuse getNewSummary to return the same data set used in summary
    const summary = await getNewSummary(userId, false);
    const loadedOnWay = (summary?.loaded?.onWay?.trips) || [];
    const loadedReported = (summary?.loaded?.reported?.trips) || [];
    const unloadedStanding = (summary?.empty?.standing?.trips) || [];

    // Exclude vehicles that are already in unloaded (standing) list
    const unloadedSet = new Set(unloadedStanding.map(t => t.VehicleNo));
    const combined = [...loadedOnWay, ...loadedReported].filter(t => !unloadedSet.has(t.VehicleNo));

    // Deduplicate by VehicleNo (keep first occurrence)
    const seen = new Set();
    return combined.filter(t => {
        if (seen.has(t.VehicleNo)) return false;
        seen.add(t.VehicleNo);
        return true;
    });
}

/**
 * Returns unloaded (not planned) vehicles using the same facet from getNewSummary
 */
async function getUnloadedNotPlannedVehicles(userId) {
    const summary = await getNewSummary(userId, false);
    return (summary?.empty?.standing?.trips) || [];
}

/**
 * Returns unloaded planned vehicles (empty trips) using getNewSummary facets.
 * Returns a deduplicated array sorted by VehicleNo to match previous behavior.
 */
async function getUnloadedPlannedVehicles(userId) {
    const summary = await getNewSummary(userId, false);
    const emptyOnWay = (summary?.empty?.onWay?.trips) || [];
    const emptyReported = (summary?.empty?.reported?.trips) || [];

    const combined = [...emptyOnWay, ...emptyReported];

    // Deduplicate by VehicleNo (keep first occurrence)
    const unique = [];
    const seen = new Set();
    combined.forEach(t => {
        if (!seen.has(t.VehicleNo)) {
            seen.add(t.VehicleNo);
            unique.push(t);
        }
    });

    // Sort by VehicleNo similar to original implementation
    return unique.sort((a, b) => {
        const aNo = a.VehicleNo || '';
        const bNo = b.VehicleNo || '';
        return aNo.localeCompare(bNo);
    });
}

async function getNewSummary(userId, isAdmin) {
    try {
        const vehicles = await getUserVehicles(userId);
        const deactivatedVehicles = await getUsersDeactivatedVehicles(userId);
        const vehicleNos = vehicles.map(v => v);
        const activeVehicleNos = vehicleNos.filter(v => !deactivatedVehicles.includes(v));
        // Get latest status updates for all active vehicles
        let latestUpdates = [];
        try {
            latestUpdates = await getLatestVehicleUpdates(activeVehicleNos);
        } catch (err) {
            latestUpdates = [];
        }
        // Map for quick lookup
        const updatesMap = new Map();
        latestUpdates.forEach(u => updatesMap.set(u.vehicleNo, u));

        // Aggregate all latest trips per vehicle and facet them
        const result = await aggregateTrips([
            {
                $match: {
                    VehicleNo: { $in: activeVehicleNos }
                }
            },
            // Sort by StartDate desc, then by rankindex asc (0 first)
            { $sort: { StartDate: -1, rankindex: 1 } },
            {
                $group: {
                    _id: "$VehicleNo",
                    LatestTrip: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$LatestTrip" } },
            {
                $facet: {
                    loadedOnWay: [
                        {
                            $match: {
                                LoadStatus: 1,
                                $or: [
                                    { ReportingDate: { $exists: false } },
                                    { ReportingDate: { $eq: null } }
                                ]
                            }
                        }
                    ],
                    loadedReported: [
                        {
                            $match: {
                                LoadStatus: 1,
                                $and: [
                                    { ReportingDate: { $exists: true } },
                                    { ReportingDate: { $ne: null } },
                                    {
                                        $or: [
                                            {
                                                $or: [
                                                    { EndDate: { $exists: false } },
                                                    { EndDate: { $eq: null } }
                                                ]
                                            },
                                            {
                                                $or: [
                                                    { "LoadTripDetail.UnloadDate": { $exists: false } },
                                                    { "LoadTripDetail.UnloadDate": { $eq: null } }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    ],
                    emptyOnWay: [
                        {
                            $match: {
                                LoadStatus: 0,
                                $or: [
                                    { ReportingDate: { $exists: false } },
                                    { ReportingDate: { $eq: null } }
                                ]
                            }
                        }
                    ],
                    emptyReported: [
                        {
                            $match: {
                                LoadStatus: 0,
                                ReportingDate: { $exists: true },
                                ReportingDate: { $ne: null },
                            }
                        }
                    ],
                    unloadedNotPlanned: [
                        {
                            $match: {
                                LoadStatus: 1,
                                $and: [
                                    { "LoadTripDetail.UnloadDate": { $exists: true } },
                                    { "LoadTripDetail.UnloadDate": { $ne: null } }
                                ]
                            }
                        }
                    ]
                }
            }
        ]).allowDiskUse(true);

        const {
            loadedOnWay = [],
            loadedReported = [],
            emptyOnWay = [],
            emptyReported = [],
            unloadedNotPlanned = []
        } = result[0] || {};

        // Helper to embed last status update in each trip
        function embedLastStatus(trips) {
            return trips.map(trip => {
                const update = updatesMap.get(trip.VehicleNo);
                return {
                    ...trip,
                    lastStatusUpdate: update || null
                };
            });
        }

        // Embed last status update in all trip arrays
        const loadedOnWayWithStatus = embedLastStatus(loadedOnWay);
        const loadedReportedWithStatus = embedLastStatus(loadedReported);
        const emptyOnWayWithStatus = embedLastStatus(emptyOnWay);
        const emptyReportedWithStatus = embedLastStatus(emptyReported);
        const unloadedNotPlannedWithStatus = embedLastStatus(unloadedNotPlanned);

        if (isAdmin) {
            const allVehicleNos = [
                ...loadedOnWayWithStatus.map(t => t.VehicleNo),
                ...loadedReportedWithStatus.map(t => t.VehicleNo),
                ...emptyOnWayWithStatus.map(t => t.VehicleNo),
                ...emptyReportedWithStatus.map(t => t.VehicleNo),
                ...unloadedNotPlannedWithStatus.map(t => t.VehicleNo)
            ];

            const users = await findTransUsers(
                {
                    Division: { $in: [0, 1, 2, 3] },
                    myVehicles: { $in: allVehicleNos }
                },
                { UserName: 1, myVehicles: 1, Division: 1 }
            ).lean();

            const veicleWiseCapacity = await findVehicles(
                { VehicleNo: { $in: allVehicleNos } },
                { VehicleNo: 1, capacity: 1 }
            ).lean();
            const capacityMap = {};
            veicleWiseCapacity.forEach(v => {
                capacityMap[v.VehicleNo] = v.capacity;
            });

            const attachSuperviser = (trips) => {
                trips.forEach((trip) => {
                    const matchedUsers = users.filter(u => u.myVehicles.includes(trip.VehicleNo));
                    trip.superwiser = matchedUsers.map(u => u.UserName).join(", ") || "Not found";
                });
            };

            const attachCapacity = (trips) => {
                trips.forEach(trip => {
                    trip.capacity = capacityMap[trip.VehicleNo] || 'N/A';
                });
            };

            attachCapacity(loadedOnWayWithStatus);
            attachCapacity(loadedReportedWithStatus);
            attachCapacity(emptyOnWayWithStatus);
            attachCapacity(emptyReportedWithStatus);
            attachCapacity(unloadedNotPlannedWithStatus);
            attachSuperviser(loadedOnWayWithStatus);
            attachSuperviser(loadedReportedWithStatus);
            attachSuperviser(emptyOnWayWithStatus);
            attachSuperviser(emptyReportedWithStatus);
            attachSuperviser(unloadedNotPlannedWithStatus);
        }

        return {
            loaded: {
                onWay: {
                    count: loadedOnWayWithStatus.length,
                    trips: loadedOnWayWithStatus
                },
                reported: {
                    count: loadedReportedWithStatus.length,
                    trips: loadedReportedWithStatus
                }
            },
            empty: {
                onWay: {
                    count: emptyOnWayWithStatus.length,
                    trips: emptyOnWayWithStatus
                },
                standing: {
                    count: unloadedNotPlannedWithStatus.length,
                    trips: unloadedNotPlannedWithStatus
                },
                reported: {
                    count: emptyReportedWithStatus.length,
                    trips: emptyReportedWithStatus
                }
            }
        };
    } catch (error) {
        throw new Error(error);
    }

}

async function createEmptyTrip(postData) {
    const {
        VehicleNo,
        driverName,
        driverMobile,
        stackHolder,
        targetTime,
        odometer,
        orderedBy,
        proposedBy,
        previousTripId,
        StartFrom,
        division,
        proposedDate
    } = postData;

    const divisionNo = getDivisionKeyByValue(division);

    if (typeof division == 'undefined') {
        throw new Error('Error constructing division number')
    }

    if (!mongoose.Types.ObjectId.isValid(previousTripId)) {
        throw new Error('Invalid previousTripId');
    }

    const newEmptyTrip = new TankersTrip({
        VehicleNo: VehicleNo,
        StartDate: new Date(new Date(proposedDate).setHours(0, 0, 0, 0)),
        EndDate: null,
        targetTime: new Date(targetTime),
        StartDriver: driverName,
        StartDriverMobile: driverMobile,
        StartFrom,
        EndTo: stackHolder,
        LoadStatus: 0,
        EmptyTripDetail: {
            StartOdometer: odometer,
            VehicleNo: VehicleNo,
            ProposedDate: proposedDate ? new Date(proposedDate) : undefined,
            ProposedBy: proposedBy,
            OrderedBy: orderedBy,
            Division: divisionNo,
            PreviousTripId: new mongoose.Types.ObjectId(previousTripId),
            PreviousTripIdNew: previousTripId,
        },
        ReportingDate: null,
        EndDate: null
    });

    return await newEmptyTrip.save();
}

async function updateEmptyTrip(tripId, postData) {
    const {
        vehicleNo,
        driverName,
        driverMobile,
        stackHolder,
        targetTime,
        odometer,
        orderedBy,
        proposedBy,
        previousTripId,
        StartFrom,
        division,
        proposedDate
    } = postData;

    // Validate division
    const divisionNo = getDivisionKeyByValue(division);
    if (typeof division === 'undefined') {
        throw new Error('Error constructing division number');
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
        throw new Error('Invalid tripId');
    }
    if (!mongoose.Types.ObjectId.isValid(previousTripId)) {
        throw new Error('Invalid previousTripId');
    }

    // Find and update the existing trip
    const updatedTrip = await updateTripById(
        tripId,
        {
            $set: {
                VehicleNo: vehicleNo,
                StartDate: new Date(),
                EndDate: null,
                targetTime: new Date(targetTime),
                StartDriver: driverName,
                StartDriverMobile: driverMobile,
                StartFrom,
                EndTo: stackHolder,
                LoadStatus: 0,
                EmptyTripDetail: {
                    VehicleNo: vehicleNo,
                    ProposedDate: proposedDate ? new Date(proposedDate) : undefined,
                    ProposedBy: proposedBy,
                    OrderedBy: orderedBy,
                    Division: divisionNo,
                    PreviousTripId: new mongoose.Types.ObjectId(previousTripId),
                    PreviousTripIdNew: previousTripId,
                    StartOdometer: odometer
                },
                ReportingDate: null,
                EndDate: null
            }
        },
        { new: true, runValidators: true } // Return updated document and run schema validators
    );

    if (!updatedTrip) {
        throw new Error('Trip not found');
    }

    return updatedTrip;
}


// Named exports
export {
    getCurrentTrip,
    getCurrentTripByDriverId,
    getAllTrips,
    getAllTripsForVehicle,
    getUserVehicles,
    getUsersDeactivatedVehicles,
    getLoadedNotUnloadedVehicles,
    getUnloadedNotPlannedVehicles,
    getUnloadedPlannedVehicles,
    division,
    getDivisionKeyByValue,
    createEmptyTrip,
    updateEmptyTrip,
    getNewSummary,
    getTripById
};

// Default export for backward compatibility
export default {
    getCurrentTrip,
    getCurrentTripByDriverId,
    getAllTrips,
    getAllTripsForVehicle,
    getUserVehicles,
    getUsersDeactivatedVehicles,
    getLoadedNotUnloadedVehicles,
    getUnloadedNotPlannedVehicles,
    getUnloadedPlannedVehicles,
    division,
    getDivisionKeyByValue,
    createEmptyTrip,
    updateEmptyTrip,
    getNewSummary,
    getTripById
};