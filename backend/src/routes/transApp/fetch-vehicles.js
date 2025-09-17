const express = require('express');
const router = express.Router();
const {
    getUserVehicles,
    getLoadedNotUnloadedVehicles,
    getUnloadedNotPlannedVehicles,
    getUnloadedPlannedVehicles,
    getNewSummary,
    getTripById,
    getCurrentTripByDriverId
} = require('./utils');
const { getLatestVehicleUpdates } = require('../../utils/vehicles');
const { getVehiclesFullDetails } = require('../../utils/enrichVehicles');

// Get latest status update for each vehicle of a user by userId
router.get('/latest-vehicle-updates', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        const vehicles = await getUserVehicles(userId);
        if (!vehicles || vehicles.length === 0) {
            return res.status(404).json({ error: 'No vehicles found for this user.' });
        }
        // vehicles can be array of objects or strings, extract vehicle numbers
        const vehicleNumbers = vehicles.map(v => v.VehicleNo || v.vehicleNo || v);
        const updates = await getLatestVehicleUpdates(vehicleNumbers);
        return res.status(200).json(updates);
    } catch (error) {
        console.error('Error fetching latest vehicle updates:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        const vehicles = await getUserVehicles(userId);
        if (!vehicles || vehicles.length === 0) {
            return res.status(404).json({ error: 'No vehicles found for this user.' });
        }
        return res.status(200).json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/get-latest-trip/:driverName', async (req, res) => {
    const { driverName } = req.params;
    try {
        const latestTrip = await getCurrentTripByDriverId(driverName);
        const vehicleNo = latestTrip.VehicleNo;
        return res.status(200).json({ latestTrip, vehicleNo });
    } catch (error) {
        return res.status(500).json(error);
    }
})

router.get('/get-trip-by-id/:tripId', async (req, res) => {
    const { tripId } = req.params;
    try {
        const trip = await getTripById(tripId);
        if (!trip) {
            console.log('trip not found with the id: ', tripId)
            return res.status(404).json({ error: 'Trip not found.' });
        }
        return res.status(200).json(trip);
    } catch (error) {
        console.error('Error fetching trip by ID:', error);
        return res.status(500).json({ error })
    }
});

router.get('/loaded-not-unloaded', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        const loadedVehicles = await getLoadedNotUnloadedVehicles(userId);
        if (!loadedVehicles || loadedVehicles.length === 0) {
            return res.status(404).json({ error: 'No loaded vehicles found.' });
        }
        return res.status(200).json({ loadedVehicles, count: loadedVehicles.length });
    } catch (error) {
        console.error('Error fetching loaded vehicles:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/unloaded-not-planned', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        const unplannedTrips = await getUnloadedNotPlannedVehicles(userId);
        if (!unplannedTrips || unplannedTrips.length === 0) {
            return res.status(404).json({ error: 'No unplanned vehicles found.' });
        }
        return res.status(200).json({ unplannedTrips, count: unplannedTrips.length });
    } catch (error) {
        console.error('Error fetching loaded vehicles:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/unloaded-planned', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        const result = await getUnloadedPlannedVehicles(userId);
        res.json(result);
    } catch (error) {
        console.error("Error in GetEmptyVehicles:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/get-summary/:userId', async (req, res) => {
    const userId = req.params.userId;
    const isAdmin = req.query;
    try {
        const summary = await getNewSummary(userId, isAdmin);
        return res.status(200).json(summary);
    } catch (error) {
        console.error(error);
        return res.status(500).json(error);
    }
});

router.get('/user-detailed-vehicles', async (req, res) => {
    const { userId, isAdmin: isAdminQuery } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        const vehicles = await getUserVehicles(userId);
        if (!vehicles || vehicles.length === 0) {
            return res.status(404).json({ error: 'No vehicles found for this user.' });
        }
        try {
            // Parse isAdmin query param as boolean (accepts true/false or 1/0)
            const isAdmin = (
                typeof isAdminQuery === 'string'
                    ? isAdminQuery.toLowerCase() === 'true' || isAdminQuery === '1'
                    : Boolean(isAdminQuery)
            );
            const details = await getVehiclesFullDetails(vehicles, isAdmin);
            res.status(200).json(details);
        } catch (err) {
            console.error('Error fetching vehicle details:', err);
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;