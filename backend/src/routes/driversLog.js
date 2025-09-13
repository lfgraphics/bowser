const express = require("express");
const router = express.Router();
const DriversLog = require("../models/VehicleDriversLog");
const Vehicle = require("../models/vehicle");
const { getOneTripOfVehicleByDate } = require("../utils/vehicles");

// ---------------------------
// Add Driver (Joining)
// ---------------------------
router.post("/join", async (req, res) => {
    try {
        const { vehicleNo, driverId, joining, driverName } = req.body;

        if (!vehicleNo || !driverId || !joining?.date) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Attach tripId if provided (frontend will pick after confirming trip)
        const newLog = new DriversLog({
            vehicleNo,
            driver: driverId,
            joining
        });

        await newLog.save();

        // Update Vehicle with reference to this log
        const updatedVehicle = await Vehicle.findOneAndUpdate(
            { VehicleNo: vehicleNo },
            {
                $push: { driverLogs: newLog._id },
                $set: { "tripDetails.driver": driverName }
            }, { new: true }
        );

        res.json({ message: "Driver joined successfully", entry: newLog, updatedVehicle });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to add driver" });
    }
});

// ---------------------------
// Driver Leaving
// ---------------------------
router.post("/leave", async (req, res) => {
    try {
        const { vehicleNo, driverId, leaving } = req.body;

        if (!vehicleNo || !driverId || !leaving?.from) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // find latest log for this driver & vehicle
        const log = await DriversLog.findOneAndUpdate(
            { vehicleNo, driver: driverId },
            {
                $set: { leaving: leaving }
            }, { new: true, upsert: true }
        );

        const updatedVehicle = await Vehicle.findOneAndUpdate(
            { VehicleNo: vehicleNo },
            { $set: { "tripDetails.driver": "no driver" } },
            { new: true }
        );

        if (updatedVehicle) {
            if (!updatedVehicle.driverLogs.includes(log._id)) {
                updatedVehicle.driverLogs.push(log._id);
                await updatedVehicle.save();
            }
        }

        res.json({ message: "Driver leaving updated", entry: log });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update leaving status" });
    }
});

// ---------------------------
// Status Update (Remarks only)
// ---------------------------
router.post("/status-update", async (req, res) => {
    try {
        const { vehicleNo, remark } = req.body;

        if (!vehicleNo || !remark) {
            return res.status(400).json({ error: "VehicleNo and remark required" });
        }

        const newUpdate = {
            dateTime: new Date(),
            remark
        };

        const log = await DriversLog.findOneAndUpdate(
            { vehicleNo },
            { $push: { statusUpdate: newUpdate } },
            { new: true, upsert: true }
        );

        res.json({ message: "Status updated", entry: log });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to add status update" });
    }
});

// ---------------------------
// Helper: Fetch last trip before a given date
// ---------------------------
router.get("/last-trip/:vehicleNo/:date", async (req, res) => {
    try {
        const { vehicleNo, date } = req.params;
        let response = await getOneTripOfVehicleByDate(vehicleNo, date)

        return res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch last trip", error });
    }
});

module.exports = router;
