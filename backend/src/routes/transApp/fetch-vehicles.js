const express = require('express');
const router = express.Router();
const TransUser = require('../../models/TransUser');
const TankersTrip = require('../../models/VehiclesTrip');

const getUserVehicles = async (userId) => {
    try {
        const user = await TransUser.findOne({ _id: userId }, 'myVehicles');
        if (!user) {
            throw new Error('User not found');
        }
        return user.myVehicles || [];
    } catch (error) {
        console.error('Error fetching user vehicles:', error);
        throw error;
    }
}

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
})

router.get('/loaded-not-unloaded', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        const vehicles = await getUserVehicles(userId);
        const vehicleNos = vehicles.map(v => v);
        const loadedVehicles = await TankersTrip.find({
            VehicleNo: { $in: vehicleNos },
            LoadTripDetail: { $exists: true, $ne: null },
            $or: [
                { "TallyLoadDetail.UnloadingDate": { $exists: false } },
                { "TallyLoadDetail.UnloadingDate": null }
            ]
        });
        if (!loadedVehicles || loadedVehicles.length === 0) {
            return res.status(404).json({ error: 'No loaded vehicles found.' });
        }
        return res.status(200).json({ loadedVehicles, count: loadedVehicles.length, vehiclesCount: vehicleNos.length });
    } catch (error) {
        console.error('Error fetching loaded vehicles:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});



module.exports = router;