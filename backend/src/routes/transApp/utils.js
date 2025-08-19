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
        const trip = await TankersTrip.findOne({ VehicleNo: vehicleNumber }).sort({ StartDate: -1 });
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
    const vehicles = await getUserVehicles(userId);
    const vehicleNos = vehicles.map(v => v);
    const deactivatedVehicles = await getUsersDeactivatedVehicles(userId);
    return TankersTrip.aggregate([
        {
            $match: {
                VehicleNo: { $in: vehicleNos, $nin: deactivatedVehicles },
                LoadStatus: 1,
                "TallyLoadDetail.UnloadingDate": null
            }
        },
        { $sort: { StartDate: -1 } },
        {
            $group: {
                _id: "$VehicleNo",
                trip: { $first: "$$ROOT" }
            }
        },
        {
            $replaceRoot: { newRoot: "$trip" }
        }
    ]).allowDiskUse(true);
}

/**
 * The function `getUnloadedNotPlannedVehicles` retrieves the latest unloaded and not planned vehicles
 * for a specific user.
 * @param userId - The `userId` parameter is used to identify the user for whom we want to retrieve
 * information about unloaded and not planned vehicles. This function fetches the vehicles associated
 * with the user, filters out the deactivated vehicles, and then queries the TankersTrip collection to
 * find unloaded vehicles that are not planned for any
 * @returns The function `getUnloadedNotPlannedVehicles` returns a list of TankersTrip documents that
 * match the specified criteria. The documents are aggregated based on the following stages:
 */
async function getUnloadedNotPlannedVehicles(userId) {
    const vehicles = await getUserVehicles(userId);
    const vehicleNos = vehicles.map(v => v);
    const deactivatedVehicles = await getUsersDeactivatedVehicles(userId);
    const planned = await getUnloadedPlannedVehicles(userId)
    const plannedVehicles = planned.map((trip) => trip.VehicleNo)
    const toExclude = deactivatedVehicles.concat(plannedVehicles)

    return TankersTrip.aggregate([
        {
            $match: {
                VehicleNo: { $in: vehicleNos, $nin: toExclude },
                LoadStatus: 1,
                "TallyLoadDetail.UnloadingDate": { $ne: null },
            }
        },
        {
            $sort: {
                VehicleNo: 1,
                _id: -1
            }
        },
        {
            $group: {
                _id: "$VehicleNo",
                LatestTrip: { $first: "$$ROOT" }
            }
        },
        {
            $replaceRoot: {
                newRoot: "$LatestTrip"
            }
        },
        {
            $sort: {
                EndTo: 1,
                VehicleNo: 1
            }
        }
    ]);
}

/**
 * The function `getUnloadedPlannedVehicles` retrieves the latest unloaded planned vehicles for a
 * specific user while filtering out deactivated and unplanned vehicles.
 * @param userId - The `userId` parameter is used to identify the user for whom we are fetching
 * information about unloaded planned vehicles. This function retrieves a list of the latest trips for
 * vehicles that belong to the specified user, are not deactivated, and do not have any unplanned trips
 * associated with them.
 * @returns The function `getUnloadedPlannedVehicles` returns an array of the latest trips for vehicles
 * that meet the specified criteria. The trips are sorted based on the `EmptyTripDetail.VehicleNo`
 * property in ascending order.
 */
async function getUnloadedPlannedVehicles(userId) {
    const userVehicles = await getUserVehicles(userId);
    const deactivatedVehicles = await getUsersDeactivatedVehicles(userId);

    const latestTrips = await TankersTrip.aggregate()
        .match({
            VehicleNo: { $in: userVehicles, $nin: deactivatedVehicles, },
            LoadStatus: 0,
            EndDate: { $eq: null }
        }).sort({
            _id: -1
        })
        .group({
            _id: "$VehicleNo",
            Trip: { $first: "$$ROOT" }
        })
        .allowDiskUse(true)
        .exec();

    console.log(latestTrips.length)

    return latestTrips
        .map(t => t.Trip)
        .sort((a, b) => {
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

        let loadedOnway = loadedVehicles;
        let loadedReported = loadedVehicles.filter(trip => trip.TallyLoadDetail.ReportedDate !== null)
        let emptyOnWay = emptyVehicles.filter(trip => !trip.ReportingDate);
        let emptyReported = emptyVehicles.filter(trip => trip.ReportingDate);

        if (isAdmin) {
            const loadedVehiclesArray = loadedVehicles.map((trip) => trip.VehicleNo)
            const emptyVehiclesArray = emptyVehicles.map((trip) => trip.VehicleNo)
            const emptyStandingVehiclesArray = emptyStanding.map((trip) => trip.VehicleNo)
            const allvehiclesArray = [...loadedVehiclesArray, ...emptyVehiclesArray, ...emptyStandingVehiclesArray];

            const users = await TransUser
                .find(
                    { Division: { $in: [0, 1, 2, 3] }, myVehicles: { $in: allvehiclesArray } },
                    { UserName: 1, myVehicles: 1, Division: 1 }
                )
                .lean();

            loadedOnway.forEach((trip) => {
                trip.superwiser = users
                    .filter((user) => user.myVehicles.includes(trip.VehicleNo))
                    .map((user) => user.UserName)
                    .join(", ") || "Not found";
            });

            loadedReported.forEach((trip) => {
                trip.superwiser = users
                    .filter((user) => user.myVehicles.includes(trip.VehicleNo))
                    .map((user) => user.UserName)
                    .join(", ") || "Not found";
            });

            emptyOnWay.forEach((trip) => {
                trip.superwiser = users
                    .filter((user) => user.myVehicles.includes(trip.VehicleNo))
                    .map((user) => user.UserName)
                    .join(", ") || "Not found";
            });

            emptyReported.forEach((trip) => {
                trip.superwiser = users
                    .filter((user) => user.myVehicles.includes(trip.VehicleNo))
                    .map((user) => user.UserName)
                    .join(", ") || "Not found";
            });

            emptyStanding.forEach((trip) => {
                trip.superwiser = users
                    .filter((user) => user.myVehicles.includes(trip.VehicleNo))
                    .map((user) => user.UserName)
                    .join(", ") || "Not found";
            });
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
                    count: emptyStanding.length,
                    trips: emptyStanding
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

    const divisionNo = getDivisionKeyByValue(division);

    if (typeof division == 'undefined') {
        console.log('Devision error', division, divisionNo, getDivisionKeyByValue(division))
        throw new Error('Error constructing division number')
    }

    if (!mongoose.Types.ObjectId.isValid(previousTripId)) {
        throw new Error('Invalid previousTripId');
    }

    const newEmptyTrip = new TankersTrip({
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
            StartOdometer: odometer,
            VehicleNo: vehicleNo,
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
    getSummary
};