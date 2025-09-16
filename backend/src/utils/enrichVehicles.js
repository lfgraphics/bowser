// utils/vehicleAggregator.js
const Vehicle = require('../models/vehicle');
const Driver = require('../models/driver');
const TankersTrip = require('../models/VehiclesTrip');
const DriversLog = require('../models/VehicleDriversLog');

/**
 * Extract ITPL number from driver string
 */
function extractITPL(driverString) {
    const match = driverString.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
    return match ? match[0].replace(/[()]/g, '').toUpperCase() : null;
}

/**
 * Fetch vehicles and related drivers in bulk
 */
async function fetchAndEnrichVehicles(vehicleNumbers) {
    console.log('request hittin the server')
    const vehicles = await Vehicle.find({ VehicleNo: { $in: vehicleNumbers } }).populate({
        path: "lastDriverLog",
        populate: { path: "driver" }
    });

    if (vehicles.length === 0) return [];

    // Collect driver names as strings
    const driverStrings = vehicles.map(v => `${v.tripDetails.driver || ''}`);
    const validNames = driverStrings.filter(name => name && name !== 'no driver');

    // Fetch all drivers in one query
    const drivers = await Driver.find({
        Name: { $in: validNames }
    });

    // Build lookup by exact name (case-sensitive or insensitive if needed)
    const driverMap = new Map(drivers.map(d => [d.Name, d]));

    // Attach driver info
    return vehicles.map((vehicle, idx) => {
        const driverName = driverStrings[idx];
        const driver = driverMap.get(driverName);

        let lastUsedMobileNo = null;
        if (driver && driver.MobileNo && Array.isArray(driver.MobileNo)) {
            const lastUsed = driver.MobileNo.find(m => m.LastUsed === true);
            if (lastUsed) lastUsedMobileNo = lastUsed.MobileNo;
        }

        return {
            vehicle: {
                ...vehicle.toObject(),
                lastDriverLog: vehicle.lastDriverLog?.[0] || null   // pick first entry
            },
            driver: driver
                ? { _id: driver._id, name: driverName, mobile: lastUsedMobileNo }
                : { _id: null, name: driverName || 'no driver', mobile: null }
        };
    });
}

/**
 * Fetch latest trips for multiple vehicles in one query
 */
async function getLatestTrips(vehicleNumbers) {
    const trips = await TankersTrip.aggregate([
        { $match: { VehicleNo: { $in: vehicleNumbers } } },
        { $sort: { StartDate: -1 } },
        {
            $group: {
                _id: "$VehicleNo",
                latestTrip: { $first: "$$ROOT" }
            }
        }
    ]);

    return new Map(trips.map(t => [t._id, t.latestTrip]));
}

/**
 * Fetch driver leaving status for vehicles with "no driver"
 */
async function getDriverFromLog(vehicleNumbers) {
    const logs = await DriversLog.find({
        vehicleNo: { $in: vehicleNumbers }
    }).populate("driver", "_id Name MobileNo")
        .sort({ creationDate: -1 });

    const logMap = new Map();
    logs.forEach(log => {
        if (!logMap.has(log.vehicleNo)) {
            logMap.set(log.vehicleNo, log);
        }
    });

    return logMap;
}

/**
 * Consolidated fetch for latest vehicle details
 */
async function getVehiclesFullDetails(vehicleNumbers) {
    console.log('length of vehicles provided: ', vehicleNumbers)
    const enrichedVehicles = await fetchAndEnrichVehicles(vehicleNumbers);
    const tripMap = await getLatestTrips(vehicleNumbers);

    const noDriverVehicles = enrichedVehicles
        .filter(v => v.driver.name === 'no driver')
        .map(v => v.vehicle.VehicleNo);

    const logMap = noDriverVehicles.length
        ? await getDriverFromLog(noDriverVehicles)
        : new Map();

    return enrichedVehicles.map(v => {
        const vehicleNo = v.vehicle.VehicleNo;
        const latestTrip = tripMap.get(vehicleNo) || null;

        let driver = v.driver;
        if (driver.name === 'no driver' && logMap.has(vehicleNo)) {
            const log = logMap.get(vehicleNo);
            driver = {
                _id: log.driver?._id || null,
                name: log.driver?.Name || 'unknown',
                mobile: log.driver?.MobileNo?.[log.driver?.MobileNo.lenght - 1]?.MobileNo || null,
                leaving: log.leaving || null
            };
        }

        return {
            vehicle: v.vehicle,
            driver,
            latestTrip,
            lastDriverLog: v.vehicle.lastDriverLog || null
        };
    });
}

module.exports = {
    getVehiclesFullDetails
};
