import { Router } from "express";
const router = Router();
import DriversLog from "../models/VehicleDriversLog.js";
import Vehicle from "../models/vehicle.js";
import VehiclesTrip from "../models/VehiclesTrip.js";
import { getOneTripOfVehicleByDate } from "../utils/vehicles.js";

// ---------------------------
// Add Driver (Joining)
// ---------------------------
router.post("/join", async (req, res) => {
    try {
        const { vehicleNo, driverId, joining, driverName } = req.body;

        // Validation
        if (!vehicleNo || !driverId || !joining?.date) {
            return res.status(400).json({ 
                error: "Missing required fields", 
                required: ["vehicleNo", "driverId", "joining.date"] 
            });
        }

        // Validate joining date
        const joiningDate = new Date(joining.date);
        if (isNaN(joiningDate.getTime())) {
            return res.status(400).json({ error: "Invalid joining date" });
        }

        console.log(`[DRIVER-JOIN] Processing join request for driver ${driverName} to vehicle ${vehicleNo}`);

        // Find trip for vehicle
        let tripId = joining?.tripId;
        if (!tripId) {
            console.log(`[DRIVER-JOIN] Fetching trip for vehicle ${vehicleNo} on date ${joiningDate}`);
            const trip = await VehiclesTrip.findOne({
                VehicleNo: vehicleNo,
                StartDate: { $lte: joiningDate }
            }).sort({ StartDate: -1, rankindex: 1, _id: -1 }).lean();
            
            if (!trip) {
                console.log(`[DRIVER-JOIN] No trip found for vehicle ${vehicleNo}`);
                return res.status(404).json({ error: "No trip found for given vehicle and date" });
            }
            console.log(`[DRIVER-JOIN] Found trip ${trip._id} for vehicle ${vehicleNo}`);
            tripId = trip._id;
        }

        // Check if driver is already assigned to prevent duplicate assignments
        console.log(`[DRIVER-JOIN] Checking existing assignment for driver ${driverId} on vehicle ${vehicleNo}`);
        const existingLog = await DriversLog.findOne({
            vehicleNo,
            driver: driverId,
            leaving: { $exists: false }
        });

        if (existingLog) {
            console.log(`[DRIVER-JOIN] Driver ${driverId} already assigned to vehicle ${vehicleNo}`);
            return res.status(409).json({ error: "Driver is already assigned to this vehicle" });
        }
        console.log(`[DRIVER-JOIN] No existing assignment found, proceeding with join`);

        // Create driver log
        console.log(`[DRIVER-JOIN] Creating driver log entry`);
        const newLog = new DriversLog({ 
            vehicleNo, 
            driver: driverId, 
            joining: {
                ...joining,
                date: joiningDate,
                tripId
            }
        });
        const savedLog = await newLog.save();
        console.log(`[DRIVER-JOIN] Driver log created with ID: ${savedLog._id}`);

        // Update vehicle - remove hint to avoid index conflicts
        console.log(`[DRIVER-JOIN] Updating vehicle ${vehicleNo} with driver ${driverName}`);
        const updatedVehicle = await Vehicle.findOneAndUpdate(
            { VehicleNo: vehicleNo },
            {
                $addToSet: { driverLogs: savedLog._id },
                $set: { "tripDetails.driver": driverName },
            },
            { new: true }
        );

        if (!updatedVehicle) {
            // Rollback: Remove the created log
            await DriversLog.findByIdAndDelete(savedLog._id);
            console.log(`[DRIVER-JOIN] Vehicle ${vehicleNo} not found, rolled back driver log`);
            return res.status(404).json({ error: "Vehicle not found" });
        }
        console.log(`[DRIVER-JOIN] Successfully updated vehicle ${vehicleNo}`);

        // Update trip driverStatus
        console.log(`[DRIVER-JOIN] Updating trip ${tripId} driverStatus to 1`);
        const updatedTrip = await VehiclesTrip.findByIdAndUpdate(
            tripId,
            { $set: { driverStatus: 1 } },
            { new: true }
        );
        
        if (!updatedTrip) {
            console.log(`[DRIVER-JOIN] Warning: Failed to update trip ${tripId} driverStatus`);
            // Don't rollback for trip update failure as main operation succeeded
        } else {
            console.log(`[DRIVER-JOIN] Successfully updated trip ${tripId} driverStatus to 1`);
        }

        console.log(`[DRIVER-JOIN] Successfully completed driver join for ${driverName} to vehicle ${vehicleNo}`);
        return res.json({ 
            message: "Driver joined successfully", 
            entry: savedLog, 
            updatedVehicle, 
            updatedTrip 
        });

    } catch (error) {
        console.error(`[DRIVER-JOIN] Failed to join driver to vehicle ${req.body.vehicleNo || 'unknown'}:`, error.message);
        return res.status(500).json({ error: "Failed to join driver", details: error.message });
    }
});

// ---------------------------
// Driver Leaving
// ---------------------------
router.post("/leave", async (req, res) => {
    try {
        const { vehicleNo, driverId, leaving } = req.body;

        // Validation
        if (!vehicleNo || !driverId || !leaving?.from) {
            return res.status(400).json({ 
                error: "Missing required fields", 
                required: ["vehicleNo", "driverId", "leaving.from"] 
            });
        }

        // Validate leaving date
        const leavingDate = new Date(leaving.from);
        if (isNaN(leavingDate.getTime())) {
            return res.status(400).json({ error: "Invalid leaving date" });
        }

        console.log(`[DRIVER-LEAVE] Processing leave request for driver ${driverId} from vehicle ${vehicleNo}`);

        // Find trip for vehicle
        console.log(`[DRIVER-LEAVE] Fetching trip for vehicle ${vehicleNo} on date ${leavingDate}`);
        const trip = await VehiclesTrip.findOne({
            VehicleNo: vehicleNo,
            StartDate: { $lte: leavingDate }
        }).sort({ StartDate: -1, rankindex: 1, _id: -1 }).lean();

        if (!trip) {
            console.log(`[DRIVER-LEAVE] No trip found for vehicle ${vehicleNo}`);
            return res.status(404).json({ error: "No trip found for given vehicle and date" });
        }
        console.log(`[DRIVER-LEAVE] Found trip ${trip._id} for vehicle ${vehicleNo}`);
        const tripId = trip._id;

        // Update latest driver log for this driver & vehicle
        console.log(`[DRIVER-LEAVE] Updating driver log for driver ${driverId} on vehicle ${vehicleNo}`);
        const log = await DriversLog.findOneAndUpdate(
            { vehicleNo, driver: driverId },
            { $set: { 
                leaving: {
                    ...leaving,
                    from: leavingDate,
                    tripId
                } 
            } },
            { new: true, upsert: true }
        );

        if (!log) {
            console.log(`[DRIVER-LEAVE] Failed to update driver log for driver ${driverId}`);
            return res.status(404).json({ error: "Failed to update driver log" });
        }
        console.log(`[DRIVER-LEAVE] Successfully updated driver log for driver ${driverId}`);

        // Update vehicle: mark no driver and ensure log reference exists - remove hint
        console.log(`[DRIVER-LEAVE] Updating vehicle ${vehicleNo} to remove driver`);
        const updatedVehicle = await Vehicle.findOneAndUpdate(
            { VehicleNo: vehicleNo },
            {
                $set: { "tripDetails.driver": "no driver" },
                $addToSet: { driverLogs: log._id }
            },
            { new: true }
        );

        if (!updatedVehicle) {
            console.log(`[DRIVER-LEAVE] Vehicle ${vehicleNo} not found`);
            return res.status(404).json({ error: "Vehicle not found" });
        }
        console.log(`[DRIVER-LEAVE] Successfully updated vehicle ${vehicleNo}`);

        // Update trip driverStatus
        console.log(`[DRIVER-LEAVE] Updating trip ${tripId} driverStatus to 0`);
        const updatedTrip = await VehiclesTrip.findByIdAndUpdate(
            tripId,
            { $set: { driverStatus: 0 } },
            { new: true }
        );
        
        if (!updatedTrip) {
            console.log(`[DRIVER-LEAVE] Warning: Failed to update trip ${tripId} driverStatus`);
            // Don't fail for trip update failure as main operation succeeded
        } else {
            console.log(`[DRIVER-LEAVE] Successfully updated trip ${tripId} driverStatus to 0`);
        }

        console.log(`[DRIVER-LEAVE] Successfully completed driver leave for vehicle ${vehicleNo}`);
        return res.json({ 
            message: "Driver leaving updated", 
            entry: log, 
            updatedVehicle, 
            updatedTrip 
        });

    } catch (error) {
        console.error(`[DRIVER-LEAVE] Failed to process driver leave for vehicle ${req.body.vehicleNo || 'unknown'}:`, error.message);
        return res.status(500).json({ error: "Failed to process driver leave", details: error.message });
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
            return res.status(400).json({ 
                error: "Missing required fields", 
                required: ["vehicleNo", "remark"] 
            });
        }

        console.log(`[STATUS-UPDATE] Adding status update for vehicle ${vehicleNo}: ${remark}`);
        const newUpdate = { dateTime: new Date(), remark };
        const log = await DriversLog.findOneAndUpdate(
            { vehicleNo },
            { $push: { statusUpdate: newUpdate } },
            { new: true, upsert: true }
        );

        if (!log) {
            return res.status(404).json({ error: "Failed to update status" });
        }

        console.log(`[STATUS-UPDATE] Successfully added status update for vehicle ${vehicleNo}`);
        return res.json({ message: "Status updated", log });

    } catch (error) {
        console.error(`[STATUS-UPDATE] Failed to update status for vehicle ${vehicleNo}:`, error.message);
        return res.status(500).json({ error: "Failed to update status", details: error.message });
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
        console.error(`[LAST-TRIP] Error fetching trip for ${vehicleNo}:`, error.message);
        return res.status(500).json({ error: "Failed to fetch trip", details: error.message });
    }
});

export default router;
