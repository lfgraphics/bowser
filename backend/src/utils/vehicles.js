import { findOne as findOneTrip, find as findTrips } from "../models/VehiclesTrip.js";
import { aggregate as aggregateDriverLogs } from '../models/VehicleDriversLog.js';
import { aggregate as aggregateMorningUpdates } from '../models/MorningUpdate.js';

const getOneTripOfVehicleByDate = async (vehicelno, date) => {
    try {
        // Parse and validate date
        let parsedDate;
        try {
            parsedDate = new Date(date);
            // Check if date is valid
            if (isNaN(parsedDate.getTime())) {
                throw new Error(`Invalid date format: ${date}`);
            }
        } catch (dateError) {
            throw new Error(`Invalid date format: ${date}. Expected format: YYYY-MM-DD or ISO date string`);
        }

        console.log(`[TRIP-QUERY] Searching for vehicle ${vehicelno} with StartDate <= ${parsedDate.toISOString()}`);

        const trip = await findOneTrip({
            VehicleNo: vehicelno,
            StartDate: { $lte: parsedDate, $ne: null }
        }).sort({ StartDate: -1, rankindex: 1 });

        if (!trip) {
            throw new Error(`No trip found for vehicle ${vehicelno} before date ${parsedDate.toISOString()}`);
        }

        console.log(`[TRIP-QUERY] Found trip ${trip._id} with StartDate ${trip.StartDate}`);
        return { latestTrip: trip };
    } catch (error) {
        console.error(`[TRIP-QUERY-ERROR] ${error.message}`);
        throw error;
    }
}

const getLatestVehicleUpdates = async (vehicleNumbers = []) => {
    if (!Array.isArray(vehicleNumbers) || vehicleNumbers.length === 0) {
        throw new Error("vehicleNumbers must be a non-empty array");
    }

    const updatesMap = new Map();

    // 1. Get TankersTrip data
    const tankerTrips = await findTrips({ VehicleNo: { $in: vehicleNumbers } })
        .select('VehicleNo TravelHistory statusUpdate')
        .sort({ StartDate: -1 }); // assumes newest trips first

    for (const trip of tankerTrips) {
        const vehicleNo = trip.VehicleNo;
        let latest = { dateTime: null, comment: null, source: null };

        // TravelHistory - ManagerComment
        const lastTravel = trip.TravelHistory?.[trip.TravelHistory.length - 1];
        if (lastTravel?.ManagerComment) {
            latest = {
                comment: lastTravel.ManagerComment,
                dateTime: lastTravel.TrackUpdateDate,
                source: 'Trip Travel History',
            };
        }

        // statusUpdate - comment or status
        const lastStatus = trip.statusUpdate?.[trip.statusUpdate.length - 1];
        if (lastStatus?.comment || lastStatus?.status) {
            const isMoreRecent = !latest.dateTime || new Date(lastStatus.dateTime) > new Date(latest.dateTime);
            if (isMoreRecent) {
                latest = {
                    comment: lastStatus.comment || lastStatus.status,
                    dateTime: lastStatus.dateTime,
                    source: 'Trip Staus',
                };
            }
        }

        if (latest.comment) {
            updatesMap.set(vehicleNo, latest);
        }
    }

    // 2. Get DriversLog data
    const driverLogs = await aggregateDriverLogs([
        { $match: { vehicleNo: { $in: vehicleNumbers } } },
        { $sort: { creationDate: -1 } }, // newest first by creationDate
        {
            $group: {
                _id: "$vehicleNo",
                doc: { $first: "$$ROOT" } // pick the newest document per vehicle
            }
        },
        { $replaceRoot: { newRoot: "$doc" } },
        { $project: { vehicleNo: 1, statusUpdate: 1, creationDate: 1, leaving: 1, joining: 1 } }
    ]);

    const extractRemarkDate = (obj) => {
        if (!obj) return null;
        // If array, pick last element
        const item = Array.isArray(obj) ? obj[obj.length - 1] : obj;
        if (!item) return null;
        const remark = item.remark || item.comment || item.status || item.message || null;
        const date = item.dateTime || item.date || item.creationDate || item.leaveDate || item.joiningDate || null;
        return remark ? { remark, date } : null;
    };

    for (const log of driverLogs) {
        const candidates = [];

        // Last statusUpdate entry
        const lastStatus = Array.isArray(log.statusUpdate) && log.statusUpdate.length
            ? log.statusUpdate[log.statusUpdate.length - 1]
            : null;
        if (lastStatus) {
            const remark = lastStatus.remark || lastStatus.comment || lastStatus.status || null;
            const date = lastStatus.dateTime || lastStatus.date || null;
            if (remark) candidates.push({ remark, date, source: 'Driver Status Update' });
        }

        // Leaving remark/date (supports object or array)
        const leaving = extractRemarkDate(log.leaving);
        if (leaving) candidates.push({ remark: leaving.remark, date: leaving.date, source: 'Driver Leaving' });

        // Joining remark/date (supports object or array)
        const joining = extractRemarkDate(log.joining);
        if (joining) candidates.push({ remark: joining.remark, date: joining.date, source: 'Driver Joining' });

        // Choose the most recent candidate by date; fallback to log.creationDate if candidate has no date
        let best = null;
        for (const c of candidates) {
            const cDate = c.date ? new Date(c.date) : (log.creationDate ? new Date(log.creationDate) : null);
            if (!best) {
                best = { ...c, resolvedDate: cDate };
                continue;
            }
            const bestDate = best.resolvedDate;
            if (!bestDate && cDate) {
                best = { ...c, resolvedDate: cDate };
            } else if (bestDate && cDate && cDate > bestDate) {
                best = { ...c, resolvedDate: cDate };
            }
        }

        if (best) {
            const current = updatesMap.get(log.vehicleNo);
            const currentDate = current ? new Date(current.dateTime) : null;
            const bestDate = best.resolvedDate || (log.creationDate ? new Date(log.creationDate) : null);
            const isMoreRecent = !currentDate || (bestDate && bestDate > currentDate);
            if (isMoreRecent) {
                updatesMap.set(log.vehicleNo, {
                    comment: best.remark,
                    dateTime: bestDate || log.creationDate,
                    source: best.source,
                });
            }
        }
    }

    // 3. Get MorningUpdate data
    const morningUpdates = await aggregateMorningUpdates([
        { $match: { 'report.vehicleNo': { $in: vehicleNumbers } } },
        { $unwind: '$report' },
        { $match: { 'report.vehicleNo': { $in: vehicleNumbers } } },
        { $sort: { openingTime: -1 } },
        {
            $group: {
                _id: '$report.vehicleNo',
                doc: { $first: '$$ROOT' }
            }
        },
        { $replaceRoot: { newRoot: '$doc' } }
    ]);

    for (const update of morningUpdates) {
        const reportItems = Array.isArray(update.report) ? update.report : (update.report ? [update.report] : []);

        for (const reportItem of reportItems) {
            if (!vehicleNumbers.includes(reportItem.vehicleNo)) continue;

            const current = updatesMap.get(reportItem.vehicleNo);
            const isMoreRecent = !current || new Date(update.openingTime) > new Date(current.dateTime);
            if (isMoreRecent) {
                updatesMap.set(reportItem.vehicleNo, {
                    comment: reportItem.remark,
                    dateTime: update.openingTime,
                    source: 'Morning Update Report',
                });
            }
        }
    }

    // Format final result
    return vehicleNumbers.map(vehicleNo => ({
        vehicleNo,
        ...(updatesMap.get(vehicleNo) || {
            comment: null,
            dateTime: null,
            source: null
        })
    }));
};

// Named exports
export { getOneTripOfVehicleByDate, getLatestVehicleUpdates };

// Default export for backward compatibility
export default { getOneTripOfVehicleByDate, getLatestVehicleUpdates };
