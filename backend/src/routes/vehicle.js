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
    const { query, limit = 20, manager, d = false, page = 1, } = req.body;
    const skip = (page - 1) * limit;
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
        if (!d) {
            params = {
                ...params,
                VehicleNo: { $not: /^D-/ }
            }
        }

        const vehicles = await Vehicle.find(params).skip(skip).limit(Number(limit)).lean();
        const totalRecords = await Vehicle.countDocuments(params)
        return res.status(200).json({
            vehicles,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            currentPage: Number(page),
        });
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

router.put('/update-details/:vehicle', async (req, res) => {
    const { vehicle } = req.body;
    try {
        const vehicleDetails = await Vehicle.findOneAndUpdate(
            { VehicleNo: req.params.vehicle },
            { $set: vehicle },
            { new: true }
        ).lean();

        if (!vehicleDetails) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        return res.status(200).json(vehicleDetails);
    } catch (error) {
        console.error('Error updating vehicle details:', error);
        return res.status(500).json({ error: 'Failed to update vehicle details', error });
    }
});

router.put('/update-details', async (req, res) => {
    const vehicles = req.body;
    try {
        // Validate input
        if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
            return res.status(400).json({ error: 'Valid vehicles array is required' });
        }

        // Create bulk operations array
        const bulkOps = vehicles.map(vehicle => ({
            updateOne: {
                filter: { VehicleNo: vehicle.VehicleNo },
                update: { $set: vehicle },
                upsert: true
            }
        }));

        // Execute bulk operation
        const result = await Vehicle.bulkWrite(bulkOps);

        // Get updated vehicles
        const updatedVehicles = await Vehicle.find({
            VehicleNo: { $in: vehicles.map(v => v.VehicleNo) }
        }).lean();

        return res.status(200).json({
            message: 'Bulk update completed',
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            updatedVehicles
        });
    } catch (error) {
        console.error('Error updating vehicle details:', error);
        return res.status(500).json({ error: 'Failed to update vehicle details', error });
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

// update bulk vehicles with single manager
router.put('/manager/vehicle/update', async (req, res) => {
    try {
        const { vehicleNumbers, manager } = req.body;
        if (!vehicleNumbers || !Array.isArray(vehicleNumbers) || vehicleNumbers.length === 0) {
            return res.status(400).json({ error: 'Vehicle numbers array is required' });
        }
        if (!manager) {
            return res.status(400).json({ error: 'Manager is required' });
        }
        // Find all vehicles that match the provided vehicle numbers
        const existingVehicles = await Vehicle.find({ VehicleNo: { $in: vehicleNumbers } }).lean();
        // Identify which vehicle numbers were found
        const foundVehicleNumbers = existingVehicles.map(v => v.VehicleNo);
        // Identify which vehicle numbers were not found
        const notFoundVehicleNumbers = vehicleNumbers.filter(no => !foundVehicleNumbers.includes(no));
        // Perform bulk update operation
        const bulkUpdateResult = await Vehicle.updateMany(
            { VehicleNo: { $in: foundVehicleNumbers } },  // Ensure the field name matches the database schema
            { $set: { manager } }
        );
        // Prepare the response
        const results = {
            success: foundVehicleNumbers.map(vehicleNo => ({
                vehicleNo,
                message: 'Manager updated successfully'
            })),
            errors: notFoundVehicleNumbers.map(vehicleNo => ({
                vehicleNo,
                message: 'Vehicle not found'
            }))
        };
        return res.status(200).json({
            message: `Updated ${bulkUpdateResult.modifiedCount} of ${vehicleNumbers.length} vehicles`,
            matchedCount: bulkUpdateResult.matchedCount,
            modifiedCount: bulkUpdateResult.modifiedCount,
            results
        });
    } catch (error) {
        console.error('Error in bulk update vehicle managers:', error);
        return res.status(500).json({
            error: 'Failed to process bulk update request',
            details: error.message
        });
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
