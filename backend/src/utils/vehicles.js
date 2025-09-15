const TankersTrip = require("../models/VehiclesTrip");
const DriversLog = require('../models/VehicleDriversLog');
const MorningUpdate = require('../models/MorningUpdate');

const getOneTripOfVehicleByDate = async (vehicelno, date) => {
    try {
        const trip = await TankersTrip.findOne({
            VehicleNo: vehicelno,
            StartDate: { $lte: new Date(date) }
        }).sort({ StartDate: -1 });

        if (!trip) {
            throw new Error({ error: "No trip found before given date" });
        }

        return { latestTrip: trip };
    } catch (error) {
        console.error(error);
        throw new Error({ error: "Failed to fetch last trip", error });
    }
}

const getLatestVehicleUpdates = async (vehicleNumbers = []) => {
    if (!Array.isArray(vehicleNumbers) || vehicleNumbers.length === 0) {
        throw new Error("vehicleNumbers must be a non-empty array");
    }

    const updatesMap = new Map();

    // 1. Get TankersTrip data
    const tankerTrips = await TankersTrip.find({ VehicleNo: { $in: vehicleNumbers } })
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
                source: 'TankersTrip.TravelHistory',
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
                    source: 'TankersTrip.statusUpdate',
                };
            }
        }

        if (latest.comment) {
            updatesMap.set(vehicleNo, latest);
        }
    }

    // 2. Get DriversLog data
    const driverLogs = await DriversLog.find({ vehicleNo: { $in: vehicleNumbers } })
        .select('vehicleNo statusUpdate');

    for (const log of driverLogs) {
        const lastStatus = log.statusUpdate?.[log.statusUpdate.length - 1];
        if (lastStatus?.remark) {
            const current = updatesMap.get(log.vehicleNo);
            const isMoreRecent = !current || new Date(lastStatus.dateTime) > new Date(current.dateTime);
            if (isMoreRecent) {
                updatesMap.set(log.vehicleNo, {
                    comment: lastStatus.remark,
                    dateTime: lastStatus.dateTime,
                    source: 'DriversLog.statusUpdate',
                });
            }
        }
    }

    // 3. Get MorningUpdate data
    const morningUpdates = await MorningUpdate.find({
        'report.vehicleNo': { $in: vehicleNumbers },
    })
        .sort({ openingTime: -1 })
        .limit(50) // Optimization: no need to pull everything
        .select('openingTime report');

    for (const update of morningUpdates) {
        for (const reportItem of update.report) {
            if (!vehicleNumbers.includes(reportItem.vehicleNo)) continue;

            const current = updatesMap.get(reportItem.vehicleNo);
            const isMoreRecent = !current || new Date(update.openingTime) > new Date(current.dateTime);
            if (isMoreRecent) {
                updatesMap.set(reportItem.vehicleNo, {
                    comment: reportItem.remark,
                    dateTime: update.openingTime,
                    source: 'MorningUpdate.report',
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

module.exports = { getOneTripOfVehicleByDate, getLatestVehicleUpdates };
