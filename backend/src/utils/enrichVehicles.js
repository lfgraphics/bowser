// utils/vehicleAggregator.js
import { find as findVehicles } from '../models/vehicle.js';
import { find as findDrivers } from '../models/driver.js';
import { aggregate as aggregateVehicleTrips } from '../models/VehiclesTrip.js';
import { find as findVehicleDriversLogs } from '../models/VehicleDriversLog.js';
import { find as findTransUsers } from '../models/TransUser.js';
import { getLatestVehicleUpdates } from './vehicles.js';

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
    const vehicles = await findVehicles({ VehicleNo: { $in: vehicleNumbers } }).populate({
        path: "lastDriverLog",
        populate: { path: "driver" }
    });

    if (vehicles.length === 0) return [];

    // Collect driver names as strings
    const driverStrings = vehicles.map(v => `${v.tripDetails.driver || ''}`);
    const validNames = driverStrings.filter(name => name && name !== 'no driver');

    // Fetch all drivers in one query
    const drivers = await findDrivers({
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
    const trips = await aggregateVehicleTrips([
        { $match: { VehicleNo: { $in: vehicleNumbers } } },
        // Sort by date desc, then rankindex asc (0 highest priority)
        { $sort: { StartDate: -1, rankindex: 1 } },
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
    const logs = await findVehicleDriversLogs({
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
async function getVehiclesFullDetails(vehicleNumbers, isAdmin = false) {
    const enrichedVehicles = await fetchAndEnrichVehicles(vehicleNumbers);
    const tripMap = await getLatestTrips(vehicleNumbers);

    // Get last status update for all vehicles
    let lastStatusUpdates = [];
    try {
        lastStatusUpdates = await getLatestVehicleUpdates(vehicleNumbers);
    } catch (err) {
        lastStatusUpdates = [];
    }
    const statusMap = new Map();
    lastStatusUpdates.forEach(u => statusMap.set(u.vehicleNo, u));

    const noDriverVehicles = enrichedVehicles
        .filter(v => v.driver.name === 'no driver')
        .map(v => v.vehicle.VehicleNo);

    const logMap = noDriverVehicles.length
        ? await getDriverFromLog(noDriverVehicles)
        : new Map();

    // Optional admin enrichment: supervisors (no capacity here)
    let userMapByVehicle = new Map();
    if (isAdmin) {
        try {
            const allVehicleNos = enrichedVehicles.map(v => v.vehicle.VehicleNo);
            const users = await findTransUsers(
                {
                    Division: { $in: [0, 1, 2, 3] },
                    myVehicles: { $in: allVehicleNos }
                },
                { UserName: 1, myVehicles: 1, Division: 1 }
            ).lean();

            userMapByVehicle = new Map();
            users.forEach(u => {
                (u.myVehicles || []).forEach(vNo => {
                    if (!userMapByVehicle.has(vNo)) userMapByVehicle.set(vNo, []);
                    userMapByVehicle.get(vNo).push(u.UserName);
                });
            });
        } catch (e) {
            console.error('Admin enrichment failed in getVehiclesFullDetails:', e);
        }
    }

    return enrichedVehicles.map(v => {
        const vehicleNo = v.vehicle.VehicleNo;
        const latestTrip = tripMap.get(vehicleNo) || null;
        const lastStatusUpdate = statusMap.get(vehicleNo) || null;

        let driver = v.driver;
        if (driver.name === 'no driver' && logMap.has(vehicleNo)) {
            const log = logMap.get(vehicleNo);
            driver = {
                _id: log.driver?._id || null,
                name: log.driver?.Name || 'unknown',
                mobile: log.driver?.MobileNo?.[log.driver?.MobileNo.length - 1]?.MobileNo || null,
                leaving: log.leaving || null
            };
        }

        const base = {
            vehicle: v.vehicle,
            driver,
            latestTrip,
            lastDriverLog: v.vehicle.lastDriverLog || null,
            lastStatusUpdate
        };
        if (isAdmin) {
            const names = userMapByVehicle.get(vehicleNo) || [];
            base.superwiser = names.length ? names.join(', ') : 'Not found';
        }
        return base;
    });
}

// Named exports
export { getVehiclesFullDetails };

// Default export for backward compatibility
export default { getVehiclesFullDetails };
