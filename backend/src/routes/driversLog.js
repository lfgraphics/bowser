import { Router } from "express";
const router = Router();
import DriversLog, { findOneAndUpdate as updateDriversLog } from "../models/VehicleDriversLog.js";
import { findOneAndUpdate as updateVehicle } from "../models/vehicle.js";
import { findOneAndUpdate as updateVehicleTrip } from "../models/VehiclesTrip.js";
import { getOneTripOfVehicleByDate } from "../utils/vehicles.js";
import { withTransaction } from "../utils/transactions.js";
import { handleTransactionError, createErrorResponse } from "../utils/errorHandler.js";

// ---------------------------
// Add Driver (Joining)
// ---------------------------
router.post("/join", async (req, res) => {
    try {
        const { vehicleNo, driverId, joining, driverName } = req.body;

        // Pre-transaction validation
        if (!vehicleNo || !driverId || !joining?.date) {
            return res
                .status(400)
                .json(createErrorResponse({ status: 400, message: "Missing required fields" }));
        }

        const result = await withTransaction(
            async (sessions) => {
                // Create driver log in transaction
                const newLog = new DriversLog({ vehicleNo, driver: driverId, joining });
                await newLog.save({ session: sessions.transport });

                // Update vehicle: attach log ref and set driver name on tripDetails
                const updatedVehicle = await updateVehicle(
                    { VehicleNo: vehicleNo },
                    {
                        $addToSet: { driverLogs: newLog._id },
                        $set: { "tripDetails.driver": driverName },
                    },
                    { new: true, session: sessions.transport }
                );

                let tripId = joining?.tripId;
                if (!tripId && joining?.date) {
                    const tripLookup = await getOneTripOfVehicleByDate(vehicleNo, joining.date);
                    tripId = tripLookup?.latestTrip?._id;
                }
                if (!tripId) {
                    const err = new Error("No trip found for given vehicle and date");
                    err.code = "TRIP_NOT_FOUND";
                    throw err;
                }

                const updatedTrip = await updateVehicleTrip(
                    { _id: tripId },
                    { $set: { driverStatus: 1 } },
                    { new: true, session: sessions.transport }
                );
                if (!updatedTrip) {
                    const err = new Error("Failed to update trip driverStatus to 1");
                    err.code = "TRIP_UPDATE_FAILED";
                    throw err;
                }

                return { newLog, updatedVehicle, updatedTrip };
            },
            {
                connections: ["transport"],
                context: { route: "driversLog/join", vehicleNo, driverId },
            }
        );

        return res.json({ message: "Driver joined successfully", ...result });
    } catch (error) {
        const errRes = handleTransactionError(error, { route: "driversLog/join" });
        return res.status(errRes.status || 500).json(errRes);
    }
});

// ---------------------------
// Driver Leaving
// ---------------------------
router.post("/leave", async (req, res) => {
    try {
        const { vehicleNo, driverId, leaving } = req.body;

        // Pre-transaction validation
        if (!vehicleNo || !driverId || !leaving?.from) {
            return res
                .status(400)
                .json(createErrorResponse({ status: 400, message: "Missing required fields" }));
        }

        const result = await withTransaction(
            async (sessions) => {
                // Update latest driver log for this driver & vehicle
                const log = await updateDriversLog(
                    { vehicleNo, driver: driverId },
                    { $set: { leaving } },
                    { new: true, upsert: true, session: sessions.transport }
                );

                // Update vehicle: mark no driver and ensure log reference exists
                const updatedVehicle = await updateVehicle(
                    { VehicleNo: vehicleNo },
                    { $set: { "tripDetails.driver": "no driver" }, $addToSet: { driverLogs: log._id } },
                    { new: true, session: sessions.transport }
                );

                // Ensure a trip is found for the leaving time
                const tripOnLeaving = await getOneTripOfVehicleByDate(vehicleNo, leaving.from);
                const tripId = tripOnLeaving?.latestTrip?._id;
                if (!tripId) {
                    const err = new Error("No trip found for given vehicle and date");
                    err.code = "TRIP_NOT_FOUND";
                    throw err;
                }

                // Update TankersTrip driverStatus within transaction
                const updatedTrip = await updateVehicleTrip(
                    { _id: tripId },
                    { $set: { driverStatus: 0 } },
                    { new: true, session: sessions.transport }
                );
                if (!updatedTrip) {
                    const err = new Error("Failed to update trip driverStatus to 0");
                    err.code = "TRIP_UPDATE_FAILED";
                    throw err;
                }

                return { log, updatedVehicle, updatedTrip };
            },
            {
                connections: ["transport"],
                context: { route: "driversLog/leave", vehicleNo, driverId },
            }
        );

        return res.json({ message: "Driver leaving updated", ...result });
    } catch (error) {
        const errRes = handleTransactionError(error, { route: "driversLog/leave" });
        return res.status(errRes.status || 500).json(errRes);
    }
});

// ---------------------------
// Status Update (Remarks only)
// ---------------------------
router.post("/status-update", async (req, res) => {
    try {
        const { vehicleNo, remark } = req.body;

        // Validation
        if (!vehicleNo || !remark) {
            return res
                .status(400)
                .json(createErrorResponse({ status: 400, message: "VehicleNo and remark required" }));
        }

        const result = await withTransaction(
            async (sessions) => {
                const newUpdate = { dateTime: new Date(), remark };
                const log = await updateDriversLog(
                    { vehicleNo },
                    { $push: { statusUpdate: newUpdate } },
                    { new: true, upsert: true, session: sessions.transport }
                );
                return { log };
            },
            { connections: ["transport"], context: { route: "driversLog/status-update", vehicleNo } }
        );

        return res.json({ message: "Status updated", ...result });
    } catch (error) {
        const errRes = handleTransactionError(error, { route: "driversLog/status-update" });
        return res.status(errRes.status || 500).json(errRes);
    }
});

// ---------------------------
// Helper: Fetch last trip before a given date
// ---------------------------
router.get("/last-trip/:vehicleNo/:date", async (req, res) => {
    try {
        const { vehicleNo, date } = req.params;
        const response = await getOneTripOfVehicleByDate(vehicleNo, date);
        return res.json(response);
    } catch (error) {
        const errRes = handleTransactionError(error, { route: "driversLog/last-trip" });
        return res.status(errRes.status || 500).json(errRes);
    }
});

export default router;
