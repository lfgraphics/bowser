const TankersTrip = require("../models/VehiclesTrip");

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

module.exports = { getOneTripOfVehicleByDate };
