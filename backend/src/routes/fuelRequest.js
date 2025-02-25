const express = require('express');
const router = express.Router();
const FuelRequest = require('../models/FuelRequest');
const { sendBulkNotifications } = require('../utils/pushNotifications');
const { mongoose } = require('mongoose');

router.post('/', async (req, res) => {
    const { vehicleNumber, driverId, driverName, driverMobile, location } = req.body;
    try {
        const fuelRequest = new FuelRequest({ vehicleNumber, driverId, driverName, driverMobile, location });
        await fuelRequest.save();
        let requestId = fuelRequest._id;
        res.status(201).json({ message: 'Fuel request created successfully', requestId });
        let notificationSent = await sendBulkNotifications({ platform: "web", groups: ['Diesel Control Center Staff'], options: { title: 'New Fuel Request', url: `/dashboard?vehicleNumber=${encodeURIComponent(vehicleNumber)}&driverId=${encodeURIComponent(driverId)}&driverName=${encodeURIComponent(driverName)}&driverMobile=${encodeURIComponent(driverMobile)}&id=${encodeURIComponent(String(requestId))}` }, message: `New fuel request for: ${vehicleNumber} from ${driverName} ${driverId}` });
        console.log('notificationSent:', JSON.stringify(notificationSent));
    } catch (err) {
        console.error('Error creating fuel request:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/', async (req, res) => {
    const { fulfilled = false, dateRange, param } = req.query;
    let query = {};
    query.fulfilled = fulfilled;
    if (dateRange) query.createdAt = { $gte: dateRange[0], $lte: dateRange[1] };
    if (param) {
        query['$or'] = [
            { vehicleNumber: { $regex: param, $options: 'i' } },
            { driverId: { $regex: param, $options: 'i' } },
            { driverName: { $regex: param, $options: 'i' } },
            { driverMobile: { $regex: param, $options: 'i' } }
        ];
    }
    console.log('query:', query);
    try {
        const fuelRequests = await FuelRequest.find(query).sort({ createdAt: -1 }).limit(20);
        if (fuelRequests.length === 0) {
            return res.status(404).json({ message: 'No fuel requests found' });
        }
        res.status(200).json(fuelRequests);
    } catch (err) {
        console.error('Error fetching fuel requests:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/vehicle-driver/:id', async (req, res) => {
    try {
        const fuelRequests = await FuelRequest.findById(req.params.id).populate('allocation');
        if (!fuelRequests) {
            return res.status(404).json({ message: 'No fuel request found' });
        }
        res.status(200).json(fuelRequests);
    } catch (err) {
        console.error('Error fetching fuel requests:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const fuelRequest = await FuelRequest.findByIdAndDelete(req.params.id);
        if (!fuelRequest) {
            return res.status(404).json({ message: 'Fuel request not found' });
        }
        res.status(200).json({ message: 'Fuel request deleted successfully' });
    } catch (err) {
        console.error('Error deleting fuel request:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.patch('/update-cordinates/:id', async (req, res) => {
    const { location } = req.body;
    try {
        const fuelRequest = await FuelRequest.findByIdAndUpdate(new mongoose.Types.ObjectId(String(req.params.id)), { location }, { new: true });
        if (!fuelRequest) {
            return res.status(404).json({ message: 'Fuel request not found' });
        }
        res.status(200).json({ message: 'Fuel request updated successfully' });
    } catch (err) {
        console.error('Error updating fuel request:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;