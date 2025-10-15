import { Router } from 'express';
import { calculateQty } from '../utils/calibration.js';
import { findOne as findOneBowser } from '../models/Bowsers.js';
import { updateMany as updateManyVehicleTrips, find as findVehicleTrips, bulkWrite as bulkWriteVehicleTrips } from '../models/VehiclesTrip.js';
import { getNewSummary } from './transApp/utils.js';

const router = Router();

router.post('/calib-calc', async (req, res) => {
    const { bowser, chamberId, levelHeight } = req.body;

    try {
        // Extract chambers from the bowser object
        const bowserData = await findOne({ regNo: { $regex: bowser, $options: "i" } }, 'chambers');
        if (!bowserData || !bowserData.chambers) {
            return res.status(404).json({ success: false, message: "Bowser not found or has no chambers." });
        }
        const bowserChambers = bowserData.chambers;

        // Calculate quantity using the calculateQty function
        const qty = calculateQty(bowserChambers, chamberId, levelHeight);
        return res.status(200).json({ success: true, quantity: qty });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/fix-unloadingDates', async (req, res) => {
    try {
        const result = await updateMany(
            { 'TallyLoadDetail.UnloadingDate': { $ne: null } },
            [
                {
                    $set: {
                        'LoadTripDetail.UnloadDate': '$TallyLoadDetail.UnloadingDate'
                    }
                }
            ]
        );

        res.status(200).json({
            message: 'UnloadDate fields updated successfully',
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Update failed:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/new-summary/:id', async (req, res) => {
    try {
        const userId = req.params.id
        const isAdmin = req.params.isAdmin;
        const summary = await getNewSummary(userId, isAdmin)
        return res.status(200).json(summary)
    } catch (err) {
        return res.status(500).json(err)
    }
});

router.get('/fix-trips-date/:vehicleNo', async (req, res) => {
    const { vehicleNo } = req.params;
    console.log(`Fixing trips for vehicle: ${vehicleNo}`);
    if (!vehicleNo) {
        return res.status(400).json({ error: 'VehicleNo is required' });
    }
    try {
        const trips = await find();
        console.log(`Found ${trips.length} trips for vehicle ${vehicleNo}`);

        const updates = trips.map(trip => {
            const start = new Date(trip.StartDate);

            // Preserve year, month, day, set time to 00:00:01.800
            start.setUTCHours(0, 0, 1, 800);

            return {
                updateOne: {
                    filter: { _id: trip._id },
                    update: { $set: { StartDate: start } }
                }
            };
        });

        if (updates.length > 0) {
            const result = await bulkWrite(updates);
            console.log({ message: 'StartDates updated', modifiedCount: result.modifiedCount, result });
            return res.json({ message: 'StartDates updated', modifiedCount: result.modifiedCount });
        } else {
            return res.status(404).json({ message: 'No trips found for this VehicleNo' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

export default router;