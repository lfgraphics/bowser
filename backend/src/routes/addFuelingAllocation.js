import { Router } from 'express';
import { Types } from 'mongoose';
import { sendNativePushNotification } from '../utils/pushNotifications.js';
import FuelingOrder, { findByIdAndUpdate as updateFuelingOrder } from '../models/fuelingOrders.js';
import { findOne as findVehicle } from '../models/vehicle.js';
import { findByIdAndUpdate as updateFuelRequest } from '../models/FuelRequest.js';
import { withTransaction } from '../utils/transactions.js';
import { handleTransactionError, createErrorResponse } from '../utils/errorHandler.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
    console.log('allocation body: ', req.body);

    const {
        allocationType,
        pumpAllocationType,
        fuelProvider,
        petrolPump,
        category,
        party,
        vehicleNumber,
        odometer,
        tripId,
        driverId,
        driverName,
        driverMobile,
        quantityType,
        fuelQuantity,
        bowser,
        allocationAdmin,
        requestId,
    } = req.body;

    // Pre-transaction validation
    const allowedAllocationTypes = ["bowser", "external", "internal"];
    const allowedQtyTypes = ["Full", "Part"];
    if (allocationType && !allowedAllocationTypes.includes(allocationType)) {
        const errBody = createErrorResponse({ status: 400, message: 'Invalid allocationType' });
        return res.status(errBody.status).json(errBody);
    }
    if (!allowedQtyTypes.includes(String(quantityType))) {
        const errBody = createErrorResponse({ status: 400, message: 'Invalid quantityType' });
        return res.status(errBody.status).json(errBody);
    }
    if (String(quantityType) === 'Part' && !(Number(fuelQuantity) > 0)) {
        const errBody = createErrorResponse({ status: 400, message: 'fuelQuantity must be > 0 for Part' });
        return res.status(errBody.status).json(errBody);
    }
    if (!driverName || !allocationAdmin?.name || !allocationAdmin?.id) {
        const errBody = createErrorResponse({ status: 400, message: 'Missing required driver/allocationAdmin fields' });
        return res.status(errBody.status).json(errBody);
    }
    if (requestId && !Types.ObjectId.isValid(String(requestId))) {
        const errBody = createErrorResponse({ status: 400, message: 'Invalid requestId' });
        return res.status(errBody.status).json(errBody);
    }

    let persistedOrder = null;
    let updatedFuelRequest = null;

    try {
        // Use transactions across bowsers and transport (transport reserved for future related ops)
        const result = await withTransaction(async (sessions) => {
            const order = new FuelingOrder({
                allocationType,
                pumpAllocationType,
                fuelProvider,
                petrolPump,
                category,
                party,
                vehicleNumber,
                odoMeter: odometer,
                tripId,
                driverId,
                driverName,
                driverMobile,
                quantityType,
                fuelQuantity,
                bowser: bowser ? {
                    regNo: bowser.regNo,
                    driver: {
                        name: bowser?.driver?.name,
                        phoneNo: bowser?.driver?.phoneNo,
                    },
                } : undefined,
                allocationAdmin: {
                    name: allocationAdmin.name,
                    id: allocationAdmin.id,
                },
                request: requestId ? new Types.ObjectId(String(requestId)) : null,
            });

            await order.save({ session: sessions.bowsers });

            let fr = null;
            if (requestId) {
                fr = await updateFuelRequest(
                    new Types.ObjectId(String(requestId)),
                    { $set: { fulfilled: true, allocation: order._id } },
                    { new: true, session: sessions.bowsers, maxTimeMS: 15000 }
                );
                if (!fr) {
                    const e = new Error('Fuel request not found');
                    e.code = 'FUEL_REQUEST_NOT_FOUND';
                    e.httpStatus = 404;
                    throw e;
                }
            }

            return { order, fr };
        }, { connections: ['bowsers', 'transport'], context: { requestId: req.requestId } });

        persistedOrder = result.order;
        updatedFuelRequest = result.fr;
    } catch (err) {
        if (err && err.code === 'FUEL_REQUEST_NOT_FOUND') {
            const body = createErrorResponse({ status: 404, message: err.message, code: err.code });
            return res.status(404).json(body);
        }
        const body = handleTransactionError(err, { requestId: req.requestId, route: 'addFuelingAllocation' });
        return res.status(body.status).json(body);
    }

    // Notification phase (outside transaction)
    let notificationSent = false;
    if (allocationType !== 'external' && bowser?.driver?.phoneNo) {
        try {
            const pushData = {
                id: String(persistedOrder._id),
                party,
                category,
                vehicleNumber,
                driverName,
                driverId,
                driverMobile,
                quantityType,
                odometer,
                tripId,
                party,
                category,
                vehicleNumber,
                driverName,
                driverId,
                driverMobile,
                quantityType,
                odometer,
                tripId,
                quantity: fuelQuantity,
                allocationAdminName: allocationAdmin.name,
                allocationAdminId: allocationAdmin.id,
                buttons: [
                    { text: 'Call Driver', action: 'call', phoneNumber: driverMobile },
                    {
                        text: 'Fuel',
                        action: 'openScreen',
                        screenName: 'NotificationFueling',
                        params: {
                            party,
                            category,
                            vehicleNumber,
                            driverName,
                            driverId,
                            driverMobile,
                            quantityType,
                            fuelQuantity,
                            allocationAdminName: allocationAdmin.name,
                            allocationAdminId: allocationAdmin.id,
                        },
                    },
                ],
            };

            const primaryHead = category == 'Bulk Sale' ? `Party: ${party}` : `Vehicle Number: ${vehicleNumber}`;
            const secondaryHead = category == 'Bulk Sale' ? `` : `Driver: ${driverName}\n`;
            const midHead = category == 'Attatch' ? `Vendor: ${party}\n` : ``;

            const sent = await sendNativePushNotification({
                mobileNumber: persistedOrder?.bowser?.driver?.phoneNo,
                message: `${primaryHead}\n${midHead}${secondaryHead}Allocated by ${allocationAdmin.name} (${allocationAdmin.id})`,
                options: { title: 'New Fueling Order', data: JSON.stringify(pushData) },
            });
            notificationSent = Boolean(sent?.success);
        } catch (_) {
            // ignore push errors
        }
    }

    // If there was a fuel request, notify requester
    if (updatedFuelRequest?.driverMobile) {
        try {
            const notificationPayloadData = {
                buttons: [
                    { text: 'Call Driver', action: 'call', phoneNumber: persistedOrder?.bowser?.driver?.phoneNo },
                ],
            };
            const fuelLer = allocationType == 'bowser'
                ? `${persistedOrder?.bowser?.driver?.name} आपके वाहन को ईंधन देने के लिए आ रहे हैं।\nड्राइवर से संपर्क करने के लिए ${persistedOrder?.bowser?.driver?.phoneNo} पर कॉल करें।`
                : allocationType == 'external'
                    ? `${fuelProvider} ${petrolPump && petrolPump.length > 0 ? 'के' + petrolPump : 'के किसी भी' + 'पेट्रोल पंप से डीज़ल ले लें'}`
                    : allocationType == 'internal'
                        ? (persistedOrder?.bowser?.driver?.name || '') + 'से' + (persistedOrder?.fuelQuantity > 0 ? persistedOrder?.fuelQuantity + ' लीटर तेल ले लीजिये' : 'फुल टंकी तेल ले लीजिये')
                        : '';

            await sendNativePushNotification({
                mobileNumber: updatedFuelRequest.driverMobile,
                message: `आपका ईंधन अनुरोध ${persistedOrder?.allocationAdmin?.id} द्वारा पूरा कर दिया गया है।\n${fuelLer}`,
                options: { title: 'ईंधन अनुरोध पूरा हुआ', data: JSON.stringify({ notificationPayloadData }) },
            });
        } catch (_) {
            // ignore push errors to not affect API result
        }
    }

    const responseMessage = notificationSent
        ? 'Fueling allocation successful. Notification sent to bowser driver.'
        : 'Fueling allocation successful. No notification sent due to missing or invalid push token.';

    return res.status(201).json({ message: responseMessage, order: persistedOrder });
}));

router.post('/updateTripDriver', asyncHandler(async (req, res) => {
    const { vehicleNo, driver } = req.body;

    if (!vehicleNo || !driver) {
        const errBody = createErrorResponse({ status: 400, message: 'vehicleNo and driver are required' });
        return res.status(errBody.status).json(errBody);
    }

    try {
        const result = await withTransaction(async (sessions) => {
            const vehicle = await findVehicle({ VehicleNo: vehicleNo }).session(sessions.transport).maxTimeMS(15000);
            if (!vehicle) return { updatedVehicle: null };
            vehicle.tripDetails = vehicle.tripDetails || {};
            vehicle.tripDetails.driver = driver;
            const updatedVehicle = await vehicle.save({ session: sessions.transport });
            return { updatedVehicle };
        }, { connections: ['transport'], context: { requestId: req.requestId, route: 'updateTripDriver' } });

        if (!result.updatedVehicle) {
            const body = createErrorResponse({ status: 404, message: 'Vehicle not found' });
            return res.status(404).json(body);
        }
        return res.status(200).json({ message: 'Driver details updated successfully', updatedVehicle: result.updatedVehicle });
    } catch (err) {
        const body = handleTransactionError(err, { requestId: req.requestId, route: 'updateTripDriver' });
        return res.status(body.status).json(body);
    }
}));

router.patch('/update/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
        const errBody = createErrorResponse({ status: 400, message: 'Invalid order id' });
        return res.status(errBody.status).json(errBody);
    }

    try {
        const result = await withTransaction(async (sessions) => {
            const order = await updateFuelingOrder(id, req.body, { new: true, session: sessions.bowsers, maxTimeMS: 15000 });
            return { order };
        }, { connections: ['bowsers'], context: { requestId: req.requestId, route: 'updateFuelingOrder' } });

        if (!result.order) {
            const body = createErrorResponse({ status: 404, message: 'Fueling order not found' });
            return res.status(404).json(body);
        }
        return res.status(200).json({ message: 'Fueling order updated successfully', order: result.order });
    } catch (err) {
        const body = handleTransactionError(err, { requestId: req.requestId, route: 'updateFuelingOrder' });
        return res.status(body.status).json(body);
    }
}));

export default router;
