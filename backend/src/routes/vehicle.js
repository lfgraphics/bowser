const express = require('express');
const Vehicle = require('../models/vehicle');
const router = express.Router();

// Get vehicles by GoodsCategory (Placed before ID-based fetch to avoid conflict)
router.get('/category/:category', async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ GoodsCategory: req.params.category }).limit(20).lean();
        if (vehicles.length === 0) {
            return res.status(404).json({ error: "No vehicles found for the given category" });
        }
        return res.status(200).json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles by category:', error);
        return res.status(500).json({ error: 'Failed to fetch vehicles', details: error });
    }
});

// Get all vehicles
router.post('/', async (req, res) => {
    const { query, limit = 20, manager } = req.body;
    try {
        let params = {};
        if (query) {
            params = {
                $or: [
                    { VehicleNo: { $regex: query, $options: 'i' } },
                    // { 'tripDetails.driver': { $regex: query, $options: 'i' } },
                    { 'tripDetails.driver.Name': { $regex: query, $options: 'i' } },
                    { 'tripDetails.driver.id': { $regex: query, $options: 'i' } },
                    { GoodsCategory: { $regex: query, $options: 'i' } }
                ]
            }
        }
        if (query == 'true' || query == 'false') {
            params = {
                'tripDetails.open': Boolean(query)
            }
        }
        if (manager) {
            params = {
                ...params, manager
            }
        }

        const vehicles = await Vehicle.find(params).limit(limit).lean();
        return res.status(200).json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        return res.status(500).json({ error: 'Failed to fetch vehicles', details: error });
    }
});

// Get a vehicle by ID
router.get('/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id).lean();
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
        return res.status(200).json(vehicle);
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        return res.status(500).json({ error: 'Failed to fetch vehicle', details: error });
    }
});

// Update vehicle by ID
router.put('/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
        return res.status(200).json(vehicle);
    } catch (error) {
        console.error('Error updating vehicle:', error);
        return res.status(500).json({ error: 'Failed to update vehicle', details: error });
    }
});

// Update vehicle's manager by ID
router.put('/:id/manager', async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { manager: req.body.manager }, { new: true }).lean();
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
        return res.status(200).json(vehicle);
    } catch (error) {
        console.error('Error updating vehicle manager:', error);
        return res.status(500).json({ error: 'Failed to update vehicle manager', details: error });
    }
});

// Delete manager field of a vehicle by ID using `$unset`
router.patch('/:id/manager', async (req, res) => {
    const { userId } = req.body;
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

        if (vehicle.manager !== userId) {
            return res.status(400).json({ error: 'You are not authorized to remove the manager' });
        }

        vehicle.manager = undefined;
        await vehicle.save();

        return res.status(200).json(vehicle);
    } catch (error) {
        console.error('Error removing vehicle manager:', error);
        return res.status(500).json({ error: 'Failed to remove vehicle manager', details: error });
    }
});

module.exports = router;
