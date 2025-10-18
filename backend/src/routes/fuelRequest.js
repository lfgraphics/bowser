import { Router } from 'express';
const router = Router();
import FuelRequest, { find as findFuelRequests, countDocuments as countFuelRequestDocuments, findById as findFuelRequestById, updateMany as updateManyFuelRequests, findByIdAndUpdate as updateFuelRequest } from '../models/FuelRequest.js';
import '../models/fuelingOrders.js';
import { sendWebPushNotification, sendBulkNotifications, getActiveTransferTargetUserId } from '../utils/pushNotifications.js';
import { findOne as findOneVehicle, find as findVehicles } from '../models/vehicle.js';
import { findOne as findOneDriver } from '../models/driver.js';
import { withTransaction } from '../utils/transactions.js';
import { handleTransactionError, createErrorResponse } from '../utils/errorHandler.js';

router.post('/', async (req, res) => {
    try {
        const { driverId, driverName, driverMobile, location, vehicleNumber, odometer } = req.body;

        // Pre-transaction validation
        if (!driverId || !driverName || !driverMobile || !location || !vehicleNumber || !odometer) {
            const errorResponse = createErrorResponse(400, 'All fields are required: driverId, driverName, driverMobile, location, vehicleNumber, odometer');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Find vehicle before transaction to fail fast
        let requestVehicle = await findOneVehicle({ VehicleNo: vehicleNumber });
        if (!requestVehicle) {
            const errorResponse = createErrorResponse(404, 'Vehicle not found');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Get managers before transaction
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

        // Check for existing request before transaction to fail fast
        const existingRequest = await findFuelRequests({
            vehicleNumber: requestVehicle.VehicleNo,
            tripId: requestVehicle.tripDetails.id,
            loadStatus: requestVehicle.tripDetails.loadStatus || 'Not found',
            driverMobile,
            fulfilled: false
        });

        if (existingRequest.length > 0) {
            const errorResponse = createErrorResponse(400, 'आप का अनुरोध पहले ही दर्ज किया जा चुका है कृपया इंतज़ार करें');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        console.log('Fuel request :', fuelRequest);

        // Wrap database operations in transaction
        const result = await withTransaction(async (sessions) => {
            await fuelRequest.save({ session: sessions.bowsers });

            return {
                requestId: fuelRequest._id,
                vehicleNo: requestVehicle.VehicleNo,
                driverName,
                driverId
            };
        }, { connections: ['bowsers'] });

        // Send response immediately after transaction commits
        res.status(201).json({ message: 'Fuel request created successfully', requestId: result.requestId });

        // Send notifications outside transaction (don't affect the response if notifications fail)
        try {
            const options = { title: 'New Fuel Request', url: `/fuel-request`, id: String(result.requestId) };
            const message = `New fuel request for: ${result.vehicleNo} from ${result.driverName} - ${result.driverId}`;
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
            };

            await notify();
            console.log('notificationSent status: ', JSON.stringify(notificationSent));
        } catch (notificationError) {
            console.error('Notification error (request still created):', notificationError);
        }
    } catch (err) {
        console.error('Error creating fuel request:', err);
        const errorResponse = handleTransactionError(err, { route: '/fuelRequest', vehicleNumber: req.body.vehicleNumber, driverId: req.body.driverId });
        // Ensure we have a valid status code
        const statusCode = errorResponse?.statusCode || 500;
        const errorBody = errorResponse?.body || { error: 'Internal server error' };
        res.status(statusCode).json(errorBody);
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
        const fuelRequests = await findFuelRequests(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalRecords = await countFuelRequestDocuments(query);
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
        const errorResponse = handleTransactionError(err, { route: '/', fulfilled: req.query.fulfilled, param: req.query.param, manager: req.query.manager });
        // Ensure we have a valid status code
        const statusCode = errorResponse?.statusCode || 500;
        const errorBody = errorResponse?.body || { error: 'Internal server error' };
        res.status(statusCode).json(errorBody);
    }
});

router.get('/driver', async (req, res) => {
    const { driverId } = req.query;
    try {
        const driver = await findOneDriver({ Name: { $regex: driverId } }).lean()
        if (driver && typeof driver.verified !== 'undefined' && !driver.verified) {
            return res.status(400).json('आप को ऐप चलने की अनुमति नहीं है')
        } else {
            const driversVehicles = await findVehicles({ 'tripDetails.driver': { $regex: driverId } });
            if (!driversVehicles || driversVehicles.length === 0) {
                return res.status(404).json({ message: 'No vehicles found for this driver' });
            }
            const vehicleNumbers = driversVehicles.map(vehicle => `${vehicle.VehicleNo} - मेनेजर: ${vehicle.manager || 'कोई नहीं'}`);
            return res.status(200).json(vehicleNumbers);
        }
    } catch (err) {
        console.error('Error fetching vehicles for driver:', err);
        const errorResponse = handleTransactionError(err, { route: '/driver', driverId: req.query.driverId });
        // Ensure we have a valid status code
        const statusCode = errorResponse?.statusCode || 500;
        const errorBody = errorResponse?.body || { error: 'Internal server error' };
        return res.status(statusCode).json(errorBody);
    }
})

router.get('/vehicle-driver/:id', async (req, res) => {
    try {
        const fuelRequests = await findFuelRequestById(req.params.id).populate('allocation');
        if (!fuelRequests) {
            return res.status(404).json({ message: 'No fuel request found' });
        }
        res.status(200).json(fuelRequests);
    } catch (err) {
        console.error('Error fetching fuel requests:', err);
        const errorResponse = handleTransactionError(err, { route: '/vehicle-driver/:id', requestId: req.params.id });
        // Ensure we have a valid status code
        const statusCode = errorResponse?.statusCode || 500;
        const errorBody = errorResponse?.body || { error: 'Internal server error' };
        res.status(statusCode).json(errorBody);
    }
});

router.put('/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;

        // Pre-transaction validation
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            const errorResponse = createErrorResponse(400, 'IDs array is required and cannot be empty');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Validate all IDs are valid ObjectIds
        const mongoose = await import('mongoose');
        const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            const errorResponse = createErrorResponse(400, 'Invalid ID format detected');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        const result = await withTransaction(async (sessions) => {
            const fuelRequests = await updateManyFuelRequests(
                { _id: { $in: ids } },
                { fulfilled: true, message: 'ईंधन प्रबंधक द्वारा ईंधन भरवाई आवश्यक नहीं थी या फोन पर की गई थी, हिस्ट्री साफ़ कर दिया गया' },
                { session: sessions.bowsers }
            );

            if (fuelRequests.modifiedCount === 0) {
                throw new Error('No fuel requests found or updated');
            }

            return fuelRequests;
        }, { connections: ['bowsers'] });

        res.status(200).json({ message: 'Fuel requests deleted successfully' });
    } catch (err) {
        console.error('Error deleting fuel requests:', err);
        const errorResponse = handleTransactionError(err, { route: '/bulk-delete', idsCount: req.body.ids?.length });
        // Ensure we have a valid status code
        const statusCode = errorResponse?.statusCode || 500;
        const errorBody = errorResponse?.body || { error: 'Internal server error' };
        res.status(statusCode).json(errorBody);
    }
});

router.post('/hold-message/:id', async (req, res) => {
    try {
        const { message } = req.body;
        const { id } = req.params;

        // Pre-transaction validation
        if (!id) {
            const errorResponse = createErrorResponse(400, 'Request ID is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        const mongoose = await import('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const errorResponse = createErrorResponse(400, 'Invalid request ID format');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        if (!message) {
            const errorResponse = createErrorResponse(400, 'Message is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        const fuelRequest = await withTransaction(async (sessions) => {
            const result = await updateFuelRequest(
                id,
                { message: message },
                { new: true, session: sessions.bowsers }
            );

            if (!result) {
                throw new Error('Fuel request not found');
            }

            return result;
        }, { connections: ['bowsers'] });

        res.status(200).json({ message: 'Fuel request message updated successfully' });
    } catch (err) {
        console.error('Error updating fuel request message:', err);
        const errorResponse = handleTransactionError(err, { route: '/hold-message/:id', requestId: req.params.id });
        // Ensure we have a valid status code
        const statusCode = errorResponse?.statusCode || 500;
        const errorBody = errorResponse?.body || { error: 'Internal server error' };
        res.status(statusCode).json(errorBody);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { message } = req.body;
        const { id } = req.params;

        // Pre-transaction validation
        if (!id) {
            const errorResponse = createErrorResponse(400, 'Request ID is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        const mongoose = await import('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const errorResponse = createErrorResponse(400, 'Invalid request ID format');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        if (!message) {
            const errorResponse = createErrorResponse(400, 'Message is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        const fuelRequest = await withTransaction(async (sessions) => {
            const result = await updateFuelRequest(
                id,
                { message: message, fulfilled: true },
                { new: true, session: sessions.bowsers }
            );

            if (!result) {
                throw new Error('Fuel request not found');
            }

            return result;
        }, { connections: ['bowsers'] });

        res.status(200).json({ message: 'Fuel request deleted successfully' });
    } catch (err) {
        console.error('Error deleting fuel request:', err);
        const errorResponse = handleTransactionError(err, { route: '/:id', requestId: req.params.id });
        // Ensure we have a valid status code
        const statusCode = errorResponse?.statusCode || 500;
        const errorBody = errorResponse?.body || { error: 'Internal server error' };
        res.status(statusCode).json(errorBody);
    }
});

router.patch('/update-cordinates/:id', async (req, res) => {
    try {
        const { location } = req.body;
        const { id } = req.params;

        // Pre-transaction validation
        if (!id) {
            const errorResponse = createErrorResponse(400, 'Request ID is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        const mongoose = await import('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const errorResponse = createErrorResponse(400, 'Invalid request ID format');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        if (!location) {
            const errorResponse = createErrorResponse(400, 'Location is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        const fuelRequest = await withTransaction(async (sessions) => {
            const result = await updateFuelRequest(
                id,
                { location },
                { new: true, session: sessions.bowsers }
            );

            if (!result) {
                throw new Error('Fuel request not found');
            }

            return result;
        }, { connections: ['bowsers'] });

        res.status(200).json({ message: 'Fuel request updated successfully' });
    } catch (err) {
        console.error('Error updating fuel request:', err);
        const errorResponse = handleTransactionError(err, { route: '/update-cordinates/:id', requestId: req.params.id });
        // Ensure we have a valid status code
        const statusCode = errorResponse?.statusCode || 500;
        const errorBody = errorResponse?.body || { error: 'Internal server error' };
        res.status(statusCode).json(errorBody);
    }
});

export default router;