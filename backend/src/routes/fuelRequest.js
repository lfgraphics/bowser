const express = require('express');
const router = express.Router();
const FuelRequest = require('../models/FuelRequest');
const { sendWebPushNotification } = require('../utils/pushNotifications');
const Vehicle = require('../models/vehicle')

router.post('/', async (req, res) => {
    const { driverId, driverName, driverMobile, location } = req.body;
    try {
        let requestVehicle = await Vehicle.findOne({ 'tripDetails.driver': { $regex: driverId, $options: 'i' } })
        console.log(requestVehicle)
        const fuelRequest = new FuelRequest({ vehicleNumber: requestVehicle.VehicleNo, driverId, driverName, driverMobile, location, trip: `${requestVehicle.tripDetails.from} - ${requestVehicle.tripDetails.to}`, startDate: requestVehicle.tripDetails.startedOn, manager: requestVehicle.manager, tripStatus: `${requestVehicle.tripDetails.open ? 'Open' : 'Closed'}` });
        const existingRequest = await FuelRequest.find({
            vehicleNumber: requestVehicle.VehicleNo, driverId, driverName, driverMobile, trip: `${requestVehicle.tripDetails.from} - ${requestVehicle.tripDetails.to}`, startDate: requestVehicle.tripDetails.startedOn, fulfilled: false
        })

        console.log(fuelRequest)

        if (!existingRequest || !existingRequest.length || existingRequest.length == 0) {
            await fuelRequest.save();
            let requestId = fuelRequest._id;
            res.status(201).json({ message: 'Fuel request created successfully', requestId });
        } else {
            res.status(400).json({ error: 'आप का अनुरोध पहले ही दर्ज किया जा चुका है' });
        }

        let notificationSent = await sendWebPushNotification({ userId: requestVehicle.manager, options: { title: 'New Fuel Request', url: `/fuel-request` }, message: `New fuel request for: ${requestVehicle.VehicleNo} from ${driverName} - ${driverId}` });
        console.log('notificationSent:', JSON.stringify(notificationSent));
    } catch (err) {
        console.error('Error creating fuel request:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/', async (req, res) => {
    const { fulfilled = false, dateRange, param, manager } = req.query;
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
    if (manager && manager !== 'undefined') {
        query.manager = `${manager}`
    }

    try {
        const fuelRequests = await FuelRequest.find(query).sort({ createdAt: -1 }).limit(20);
        if (fuelRequests.length === 0) {
            return res.status(404).json({ message: 'No fuel requests found' });
        }
        res.status(200).json(fuelRequests);
        console.log(fuelRequests.length)
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
    const { message } = req.body;
    try {
        const fuelRequest = await FuelRequest.findByIdAndUpdate(req.params.id, { message: message, fulfilled: true }, { new: true });
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
        const fuelRequest = await FuelRequest.findByIdAndUpdate(req.params.id, { location }, { new: true });
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