const express = require('express');
const router = express.Router();
const {
    getUserVehicles,
    getLoadedNotUnloadedVehicles,
    getUnloadedNotPlannedVehicles,
    getUnloadedPlannedVehicles
} = require('./utils');

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

module.exports = router;