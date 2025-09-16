const TransUser = require('../../models/TransUser');
const TankersTrip = require('../../models/VehiclesTrip');
const DeactivatedVehicle = require('../../models/DeactivatedVehicles');
const Vehicle = require('../../models/vehicle');
const { mongoose } = require('mongoose');

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
        const trip = await TankersTrip.findOne({ VehicleNo: vehicleNumber }).sort({ StartDate: -1 }).lean();
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
        const trip = await TankersTrip.findOne({ StartDriver: { $regex: driverId } }).sort({ StartDate: -1 }).lean();
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
        const trips = await TankersTrip.find({ VehicleNo: vehicleNumber });
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
        const trip = await TankersTrip.findById(tripId);
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
    console.log('Called getUserVehicles with userId:', userId);
    try {
        const user = await TransUser.findOne({ _id: userId });
        if (!user) throw new Error('User not found');
        if (user.Division == 4) {
            const divisionVehicles = await Vehicle.find({}, 'VehicleNo');
            const vehiclesArray = divisionVehicles.map((vehicle) => vehicle.VehicleNo)
            return vehiclesArray || []
        } else if (user.Division >= 10) {
            let adminDivisionName = division[user.Division]
            let divisionName = adminDivisionName?.replace('Admin', "")
            let divisionKey = getDivisionKeyByValue(divisionName)
            const divisionUsers = await TransUser.find({ Division: divisionKey }, 'myVehicles')
            const vehiclesArray = divisionUsers.map(user => user.myVehicles || []).flat();
            return vehiclesArray || []
        } else {
            console.log('User found:', user.UserName, 'with vehicles:', user.myVehicles, user.myVehicles.length);
            return user.myVehicles || [];
        }
    } catch (error) {
        console.error('Error fetching user vehicles:', error);
        throw error;
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
        const user = await TransUser.findOne({ _id: userId });
        const userVehicles = user.myVehicles || [];
        const userName = user.UserName;
        const deactivatedVehiclesList = await DeactivatedVehicle.find({ 'UserInfo.CreatedBy': userName, VehicleNo: { $in: userVehicles } });
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

async function getSummary(userId, isAdmin) {
    try {
        let loadedVehicles = await getLoadedNotUnloadedVehicles(userId);
        let emptyVehicles = await getUnloadedPlannedVehicles(userId);
        let emptyStanding = await getUnloadedNotPlannedVehicles(userId);

        // Deduplication helper
        const uniqueByVehicle = (arr) =>
            arr.filter((v, i, self) => i === self.findIndex(t => t.VehicleNo === v.VehicleNo));

        // Split cleanly into 5 exclusive buckets
        let loadedOnway = uniqueByVehicle(
            loadedVehicles.filter(trip => !trip.TallyLoadDetail?.ReportedDate)
        );

        let loadedReported = uniqueByVehicle(
            loadedVehicles.filter(trip => trip.TallyLoadDetail?.ReportedDate)
        );

        let emptyOnWay = uniqueByVehicle(
            emptyVehicles.filter(trip => !trip.ReportingDate)
        );

        let emptyReported = uniqueByVehicle(
            emptyVehicles.filter(trip => trip.ReportingDate)
        );

        let emptyStandingUnique = uniqueByVehicle(emptyStanding);

        if (isAdmin) {
            const allvehiclesArray = [
                ...loadedOnway.map((t) => t.VehicleNo),
                ...loadedReported.map((t) => t.VehicleNo),
                ...emptyOnWay.map((t) => t.VehicleNo),
                ...emptyReported.map((t) => t.VehicleNo),
                ...emptyStandingUnique.map((t) => t.VehicleNo)
            ];

            const users = await TransUser.find(
                { Division: { $in: [0, 1, 2, 3] }, myVehicles: { $in: allvehiclesArray } },
                { UserName: 1, myVehicles: 1, Division: 1 }
            ).lean();

            const attachSuperviser = (trips) => {
                trips.forEach((trip) => {
                    const matchedUsers = users.filter((u) => u.myVehicles.includes(trip.VehicleNo));
                    trip.superwiser = matchedUsers.map((u) => u.UserName).join(", ") || "Not found";
                });
            };

            attachSuperviser(loadedOnway);
            attachSuperviser(loadedReported);
            attachSuperviser(emptyOnWay);
            attachSuperviser(emptyReported);
            attachSuperviser(emptyStandingUnique);
        }

        return {
            loaded: {
                onWay: {
                    count: loadedOnway.length,
                    trips: loadedOnway
                },
                reported: {
                    count: loadedReported.length,
                    trips: loadedReported
                }
            },
            empty: {
                onWay: {
                    count: emptyOnWay.length,
                    trips: emptyOnWay
                },
                standing: {
                    count: emptyStandingUnique.length,
                    trips: emptyStandingUnique
                },
                reported: {
                    count: emptyReported.length,
                    trips: emptyReported
                }
            }
        };
    } catch (error) {
        throw new Error(error);
    }
}

async function getNewSummary(userId, isAdmin) {
    try {
        const vehicles = await getUserVehicles(userId);
        const deactivatedVehicles = await getUsersDeactivatedVehicles(userId);
        const vehicleNos = vehicles.map(v => v);
        const activeVehicleNos = vehicleNos.filter(v => !deactivatedVehicles.includes(v));

        // Aggregate all latest trips per vehicle and facet them
        const result = await TankersTrip.aggregate([
            {
                $match: {
                    VehicleNo: { $in: activeVehicleNos }
                }
            },
            { $sort: { StartDate: -1 } },
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

        if (isAdmin) {
            const allVehicleNos = [
                ...loadedOnWay.map(t => t.VehicleNo),
                ...loadedReported.map(t => t.VehicleNo),
                ...emptyOnWay.map(t => t.VehicleNo),
                ...emptyReported.map(t => t.VehicleNo),
                ...unloadedNotPlanned.map(t => t.VehicleNo)
            ];

            const users = await TransUser.find(
                {
                    Division: { $in: [0, 1, 2, 3] },
                    myVehicles: { $in: allVehicleNos }
                },
                { UserName: 1, myVehicles: 1, Division: 1 }
            ).lean();

            const veicleWiseCapacity = await Vehicle.find(
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


            attachCapacity(loadedOnWay);
            attachCapacity(loadedReported);
            attachCapacity(emptyOnWay);
            attachCapacity(emptyReported);
            attachCapacity(unloadedNotPlanned);
            attachSuperviser(loadedOnWay);
            attachSuperviser(loadedReported);
            attachSuperviser(emptyOnWay);
            attachSuperviser(emptyReported);
            attachSuperviser(unloadedNotPlanned);
        }

        return {
            loaded: {
                onWay: {
                    count: loadedOnWay.length,
                    trips: loadedOnWay
                },
                reported: {
                    count: loadedReported.length,
                    trips: loadedReported
                }
            },
            empty: {
                onWay: {
                    count: emptyOnWay.length,
                    trips: emptyOnWay
                },
                standing: {
                    count: unloadedNotPlanned.length,
                    trips: unloadedNotPlanned
                },
                reported: {
                    count: emptyReported.length,
                    trips: emptyReported
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
        console.log('Devision error', division, divisionNo, getDivisionKeyByValue(division))
        throw new Error('Error constructing division number')
    }

    if (!mongoose.Types.ObjectId.isValid(previousTripId)) {
        throw new Error('Invalid previousTripId');
    }

    const newEmptyTrip = new TankersTrip({
        VehicleNo: VehicleNo,
        StartDate: new Date(proposedDate),
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
        console.log('Division error', division, divisionNo, getDivisionKeyByValue(division));
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
    const updatedTrip = await TankersTrip.findByIdAndUpdate(
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


module.exports = {
    getCurrentTrip,
    getCurrentTripByDriverId,
    getAllTrips,
    getUserVehicles,
    getUsersDeactivatedVehicles,
    getLoadedNotUnloadedVehicles,
    getUnloadedNotPlannedVehicles,
    getUnloadedPlannedVehicles,
    division,
    getDivisionKeyByValue,
    createEmptyTrip,
    updateEmptyTrip,
    getSummary,
    getNewSummary,
    getTripById
};