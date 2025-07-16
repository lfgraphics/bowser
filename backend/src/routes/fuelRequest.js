const express = require('express');
const router = express.Router();
const FuelRequest = require('../models/FuelRequest');
require('../models/fuelingOrders');
const { sendWebPushNotification, sendBulkNotifications, getActiveTransferTargetUserId } = require('../utils/pushNotifications');
const Vehicle = require('../models/vehicle');
const Driver = require('../models/driver');

router.post('/', async (req, res) => {
    const { driverId, driverName, driverMobile, location, vehicleNumber, odometer } = req.body;
    try {
        let requestVehicle = await Vehicle.findOne({ VehicleNo: vehicleNumber })
        if (!requestVehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        let managers = await getActiveTransferTargetUserId(requestVehicle.manager) || ['none'];
        if (!Array.isArray(managers)) {
            managers = [requestVehicle.manager];
        }

        const fuelRequest = new FuelRequest({
            vehicleNumber: requestVehicle.VehicleNo,
            loadStatus: requestVehicle.tripDetails.loadStatus || 'Not found',
            capacity: requestVehicle.capacity,
            odometer,
            driverId,
            driverName,
            driverMobile,
            location, trip: `${requestVehicle.tripDetails.from} - ${requestVehicle.tripDetails.to}`,
            startDate: requestVehicle.tripDetails.startedOn,
            manager: managers || 'none',
            tripStatus: `${requestVehicle.tripDetails.open ? 'Open' : 'Closed'}`,
            tripId: requestVehicle.tripDetails.id
        });

        const existingRequest = await FuelRequest.find({
            vehicleNumber: requestVehicle.VehicleNo,
            tripId: requestVehicle.tripDetails.id,
            loadStatus: requestVehicle.tripDetails.loadStatus || 'Not found',
            driverMobile,
            fulfilled: false
        })

        console.log('Fuel request :', fuelRequest)

        if (!existingRequest.length) {
            await fuelRequest.save();
            let requestId = fuelRequest._id;
            res.status(201).json({ message: 'Fuel request created successfully', requestId });
        } else {
            res.status(400).json({ message: 'आप का अनुरोध पहले ही दर्ज किया जा चुका है कृपया इंतज़ार करें' });
        }

        const options = { title: 'New Fuel Request', url: `/fuel-request`, id: String(fuelRequest._id) };
        const message = `New fuel request for: ${requestVehicle.VehicleNo} from ${driverName} - ${driverId}`
        let notificationSent;
        const notify = async () => {
            if (managers.includes('all')) {
                notificationSent = await sendBulkNotifications({
                    groups: ['Diesel Control Center Staff'],
                    message,
                    platform: "web",
                    options
                });
            } else if (managers.length === 1) {
                notificationSent = await sendWebPushNotification({
                    userId: managers[0],
                    message,
                    options
                });
            } else {
                notificationSent = await sendBulkNotifications({
                    recipients: managers.map(userId => ({ userId })),
                    message,
                    platform: "web",
                    options
                });
            }
        }

        await notify();

        console.log('notificationSent status: ', JSON.stringify(notificationSent));
    } catch (err) {
        console.error('Error creating fuel request:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/', async (req, res) => {
    const { fulfilled, dateRange, param, manager, page = 1, limit = 20 } = req.query;
    let query = {};
    if (fulfilled && fulfilled !== 'undefined') {
        query.fulfilled = fulfilled;
    }
    if (dateRange) query.createdAt = { $gte: dateRange[0], $lte: dateRange[1] };
    if (param) {
        query['$or'] = [
            { vehicleNumber: { $regex: param, $options: 'i' } },
            { driverId: { $regex: param, $options: 'i' } },
            { driverName: { $regex: param, $options: 'i' } },
            { driverMobile: { $regex: param, $options: 'i' } }
        ];
    }
    if (manager && typeof manager !== 'undefined') {
        query.manager = { $in: [manager, 'none', 'all'] };
    }

    console.log('Query:', query);

    try {
        const skip = (page - 1) * limit;
        const fuelRequests = await FuelRequest.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalRecords = await FuelRequest.countDocuments(query);
        const totalPages = Math.ceil(totalRecords / limit);

        res.status(200).json({
            requests: fuelRequests,
            pagination: {
                totalRecords,
                totalPages,
                currentPage: parseInt(page),
                limit: parseInt(limit),
            },
        });
    } catch (err) {
        console.error('Error fetching fuel requests:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/driver', async (req, res) => {
    const { driverId } = req.query;
    try {
        const driver = await Driver.findOne({ Name: { $regex: driverId } }).lean()
        if (!driver.verified) {
            return res.status(400).json('आप को ऐप चलने की अनुमति नहीं है')
        } else {
            const driversVehicles = await Vehicle.find({ 'tripDetails.driver': { $regex: driverId } });
            if (!driversVehicles || driversVehicles.length === 0) {
                return res.status(404).json({ message: 'No vehicles found for this driver' });
            }
            const vehicleNumbers = driversVehicles.map(vehicle => `${vehicle.VehicleNo} - मेनेजर: ${vehicle.manager || 'कोई नहीं'}`);
            return res.status(200).json(vehicleNumbers);
        }
    } catch (err) {
        console.error('Error fetching vehicles for driver:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
})

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

router.put('/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    try {
        const fuelRequests = await FuelRequest.updateMany(
            { _id: { $in: ids } },
            { fulfilled: true, message: 'ईंधन प्रबंधक द्वारा ईंधन भरवाई आवश्यक नहीं थी या फोन पर की गई थी, हिस्ट्री साफ़ कर दिया गया' }
        );
        if (!fuelRequests) {
            return res.status(404).json({ message: 'Fuel requests not found' });
        }
        res.status(200).json({ message: 'Fuel requests deleted successfully' });
    } catch (err) {
        console.error('Error deleting fuel requests:', err);
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