import { Router } from 'express';
const router = Router();
import LoadingOrder, { findById as findLoadingOrderById, find as findLoadingOrders, findByIdAndUpdate as updateLoadingOrder, findByIdAndDelete as deleteLoadingOrder } from '../models/LoadingOrder.js';
import { findOneAndUpdate as updateLoadingSheet, find as findLoadingSheets, findOne as findOneLoadingSheet, findByIdAndUpdate as updateLoadingSheetById, findByIdAndDelete as deleteLoadingSheetById } from '../models/LoadingSheet.js';
import { sendBulkNotifications, sendWebPushNotification } from '../utils/pushNotifications.js';
import { mongoose } from 'mongoose';
import { findOne as findOneBowser } from '../models/Bowsers.js';
import { updateTripSheet } from '../utils/tripSheet.js';
import { calculateQty } from '../utils/calibration.js';
import { withTransaction } from '../utils/transactions.js';
import { handleTransactionError, createErrorResponse } from '../utils/errorHandler.js';

// Create a new LoadingOrder
router.post('/orders', async (req, res) => {
    try {
        const { regNo, loadingDesc, loadingLocation, petrolPump, bccAuthorizedOfficer, tripSheetId } = req.body;
        console.log('Loading order request: ', req.body)

        // Pre-transaction validation
        if (!regNo || !loadingLocation || !bccAuthorizedOfficer?.id || !bccAuthorizedOfficer?.name) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Missing required fields' }));
        }
        if (!['bcc', 'petrolPump'].includes(loadingLocation)) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid loadingLocation' }));
        }
        if (loadingLocation === 'petrolPump') {
            if (!petrolPump?.phone) {
                return res.status(400).json(createErrorResponse({ status: 400, message: 'petrolPump.phone is required for petrolPump loadingLocation' }));
            }
        }

        // Transaction: save LoadingOrder
        const createdOrder = await withTransaction(async (sessions) => {
            const order = new LoadingOrder({
                regNo,
                tripSheetId,
                loadingDesc,
                loadingLocation,
                ...(petrolPump ? { petrolPump } : {}),
                bccAuthorizedOfficer: { id: bccAuthorizedOfficer.id, name: bccAuthorizedOfficer.name },
                fulfilled: false,
            });
            await order.save({ session: sessions.bowsers });
            return order;
        }, { connections: ['bowsers'], context: { route: '/orders', regNo, loadingLocation } });

        // Respond after commit
        res.status(201).json(createdOrder);

        // Notifications outside transaction
        try {
            const desc = loadingDesc ? `\nDescription: ${loadingDesc}\n` : '';
            const message = `Bowser: ${regNo}\n${desc}Ordered by: ${bccAuthorizedOfficer.name} Id: ${bccAuthorizedOfficer.id}`;
            if (loadingLocation === 'bcc') {
                const options = { title: 'New Bowser Loading Order Arrived', url: `/loading/sheet/${createdOrder._id}` };
                await sendBulkNotifications({ groups: ['Loading Incharge'], message, options, platform: 'web' });
            } else if (loadingLocation === 'petrolPump') {
                const options = { title: 'New Order Arrived', url: `/loading/petrol-pump/${createdOrder._id}` };
                await sendWebPushNotification({ mobileNumber: petrolPump.phone, message, options });
            }
        } catch (notifyErr) {
            console.error('Notification error (orders):', notifyErr?.message || notifyErr);
        }
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/orders', regNo: req?.body?.regNo, loadingLocation: req?.body?.loadingLocation });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.get('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch the loading order
        const loadingOrder = await findById(id).lean();
        if (!loadingOrder) {
            return res.status(404).json({
                title: 'Error',
                details: 'No order found',
            });
        }

        // 2. Fetch the bowser based on regNo
        const bowser = await _findOne({ regNo: loadingOrder.regNo }).populate('currentTrip').lean();

        // 3. Construct the desired response format
        //    - an array containing a single object
        const responseData = {
            order: loadingOrder,
            bowser: bowser || {},
        };

        // 4. Return the combined results in your desired format
        return res.status(200).json(responseData);
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/orders/:id', orderId: req?.params?.id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

// Fetch LoadingOrders
router.post('/orders/get', async (req, res) => {
    try {
        const { startDate, endDate, searchParam, location = "bcc" } = req.body;

        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 30);
        const defaultEndDate = new Date();

        const filter = {
            createdAt: {
                $gte: startDate && startDate !== null ? new Date(startDate) : defaultStartDate,
                $lte: endDate && endDate !== null ? new Date(endDate) : defaultEndDate,
            },
            loadingLocation: location
        };

        if (searchParam) {
            filter.$or = [
                { regNo: searchParam },
                { loadingDesc: searchParam },
                { "bccAuthorizedOfficer.id": searchParam },
                { "bccAuthorizedOfficer.name": searchParam },
                { fulfilled: searchParam === 'true' || searchParam === true },
            ];
        }

        const orders = await find(filter).sort({ createdAt: -1 }).limit(20).lean();

        if (!orders.length) {
            return res.status(404).json({ error: 'No Orders found', filter });
        }

        res.status(200).json(orders);
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/orders/get', startDate: req?.body?.startDate, endDate: req?.body?.endDate, searchParam: req?.body?.searchParam });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

// Update a LoadingOrder (PATCH)
router.patch('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || !updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Missing or invalid fields for update' }));
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid order id' }));
        }

        const updatedOrder = await withTransaction(async (sessions) => {
            const updated = await findByIdAndUpdate(
                new mongoose.Types.ObjectId(id),
                updateData,
                { new: true, runValidators: true, session: sessions.bowsers }
            );
            if (!updated) {
                const e = new Error('LoadingOrder not found');
                e.name = 'ValidationError';
                throw e;
            }
            return updated;
        }, { connections: ['bowsers'], context: { route: '/orders/:id', orderId: id } });

        res.status(200).json(updatedOrder);
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/orders/:id', orderId: req?.params?.id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.delete('/order/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Missing required id for deletion' }));
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid order id' }));
        }

        const deletedOrder = await withTransaction(async (sessions) => {
            const del = await findByIdAndDelete(new mongoose.Types.ObjectId(id), { session: sessions.bowsers });
            if (!del) {
                const e = new Error('LoadingOrder not found');
                e.name = 'ValidationError';
                throw e;
            }
            return del;
        }, { connections: ['bowsers'], context: { route: '/order/:id', orderId: id } });

        res.status(200).json({ message: 'LoadingOrder deleted successfully', deletedOrder });
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/order/:id', orderId: req?.params?.id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.post('/sheet', async (req, res) => {
    try {
        let {
            regNo,
            sheetId,
            odoMeter,
            fuleingMachine,
            pumpReadingBefore,
            pumpReadingAfter,
            chamberwiseDipListBefore,
            chamberwiseDipListAfter,
            chamberwiseSealList,
            loadingSlips,
            loadingIncharge,
            bccAuthorizedOfficer,
        } = req.body;

        // Base validation
        const missingFields = [];
        if (!regNo) missingFields.push('regNo');
        if (!odoMeter) missingFields.push('odoMeter');
        if (!fuleingMachine) missingFields.push('fuleingMachine');
        if (!loadingIncharge?.id) missingFields.push('loadingIncharge.id');
        if (!loadingIncharge?.name) missingFields.push('loadingIncharge.name');
        if (!bccAuthorizedOfficer?.orderId) missingFields.push('bccAuthorizedOfficer.orderId');
        if (!bccAuthorizedOfficer?.id) missingFields.push('bccAuthorizedOfficer.id');
        if (!bccAuthorizedOfficer?.name) missingFields.push('bccAuthorizedOfficer.name');

        if (missingFields.length > 0) {
            return res.status(400).json({ error: 'Missing required fields', missingFields });
        }
        // Additional validation
        if (!Array.isArray(chamberwiseDipListBefore) || chamberwiseDipListBefore.length === 0) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'chamberwiseDipListBefore is required and must be a non-empty array' }));
        }
        if (!Array.isArray(chamberwiseDipListAfter) || chamberwiseDipListAfter.length === 0) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'chamberwiseDipListAfter is required and must be a non-empty array' }));
        }
        if (!Array.isArray(loadingSlips) || loadingSlips.length === 0) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'loadingSlips is required and must be a non-empty array' }));
        }
        if (!mongoose.Types.ObjectId.isValid(String(bccAuthorizedOfficer.orderId))) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid bccAuthorizedOfficer.orderId' }));
        }

        // Transaction block
        const resultSheet = await withTransaction(async (sessions) => {
            // Fetch bowser with session
            const bowser = await _findOne({ regNo }).session(sessions.bowsers);
            if (!bowser) {
                const e = new Error('Bowser not found for the provided regNo');
                e.name = 'ValidationError';
                throw e;
            }
            const bowserChambers = bowser.chambers;

            // Compute dip quantities
            for (const dip of chamberwiseDipListBefore) {
                if (dip.qty == null || dip.qty === undefined || dip.qty === 0) {
                    dip.qty = calculateQty(bowserChambers, dip.chamberId, dip.levelHeight);
                }
            }
            for (const dip of chamberwiseDipListAfter) {
                if (dip.qty == null || dip.qty === undefined || dip.qty === 0) {
                    dip.qty = calculateQty(bowserChambers, dip.chamberId, dip.levelHeight);
                }
            }

            const totalLoadQuantityBySlip = loadingSlips.reduce((total, slip) => total + slip.qty, 0);
            const totalLoadQuantityByDip = chamberwiseDipListAfter.reduce((total, dip) => total + dip.qty, 0);
            const totalBefore = chamberwiseDipListBefore.reduce((total, dip) => total + dip.qty, 0);
            const tempLoadByDip = totalLoadQuantityBySlip + totalBefore;
            const additionQty = totalLoadQuantityByDip - totalBefore;

            // If sheetId present, update tripsheet additions in-session
            if (sheetId) {
                const additionEntry = {
                    sheetId: new mongoose.Types.ObjectId(sheetId),
                    quantity: additionQty,
                    quantityByDip: additionQty,
                    quantityBySlip: totalLoadQuantityBySlip,
                };
                const updateResult = await updateTripSheet({ sheetId, newAddition: additionEntry, session: sessions.bowsers });
                if (!updateResult?.success) {
                    const e = new Error(updateResult?.message || 'Trip sheet update failed');
                    e.name = 'ValidationError';
                    throw e;
                }
            }

            // Prepare LoadingSheet data (always persist or update existing by orderId)
            const sheetData = {
                regNo,
                odoMeter,
                tempLoadByDip,
                fuleingMachine,
                pumpReadingBefore,
                pumpReadingAfter,
                chamberwiseDipListBefore,
                chamberwiseDipListAfter,
                chamberwiseSealList,
                loadQty: additionQty,
                totalLoadQuantityByDip,
                totalLoadQuantityBySlip,
                loadingSlips,
                loadingIncharge,
                bccAuthorizedOfficer: {
                    ...bccAuthorizedOfficer,
                    orderId: new mongoose.Types.ObjectId(bccAuthorizedOfficer.orderId),
                },
                fulfilled: false,
                ...(sheetId ? { tripSheetId: new mongoose.Types.ObjectId(sheetId) } : {}),
            };

            // Upsert LoadingSheet by LoadingOrder (ensures a sheet exists even when sheetId is provided)
            const newLoadingSheet = await findOneAndUpdate(
                { "bccAuthorizedOfficer.orderId": new mongoose.Types.ObjectId(String(bccAuthorizedOfficer.orderId)) },
                { $set: sheetData },
                { new: true, upsert: true, setDefaultsOnInsert: true, session: sessions.bowsers }
            );

            // Mark LoadingOrder fulfilled
            const loadingOrder = await findByIdAndUpdate(
                new mongoose.Types.ObjectId(String(bccAuthorizedOfficer.orderId)),
                { $set: { fulfilled: true } },
                { new: true, session: sessions.bowsers }
            );
            if (!loadingOrder) {
                const e = new Error('Loading order not found');
                e.name = 'ValidationError';
                throw e;
            }

            return newLoadingSheet;
        }, { connections: ['bowsers'], context: { route: '/sheet', regNo, sheetId, orderId: bccAuthorizedOfficer?.orderId } });

        // Respond after commit
        res.status(200).json(resultSheet);

        // Notify outside transaction
        try {
            const options = { title: 'Your Bowser Loading Order is successful', url: !sheetId ? `/tripsheets/create/${resultSheet?._id}` : `/tripsheets/${sheetId}` };
            const message = `Bowser: ${regNo}\nFulfilled by: ${loadingIncharge.name} Id: ${loadingIncharge.id}`;
            await sendWebPushNotification({ userId: bccAuthorizedOfficer.id, message, options });
        } catch (notifyErr) {
            console.error('Notification error (sheet):', notifyErr?.message || notifyErr);
        }
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/sheet', regNo: req?.body?.regNo, sheetId: req?.body?.sheetId, orderId: req?.body?.bccAuthorizedOfficer?.orderId });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

// Fetch LoadingSheets (GET)
router.post('/sheets/get', async (req, res) => {
    try {
        const { startDate, endDate, searchParam } = req.body;

        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 30);
        const defaultEndDate = new Date();

        const filter = {
            createdAt: {
                $gte: startDate ? new Date(startDate) : defaultStartDate,
                $lte: endDate ? new Date(endDate) : defaultEndDate,
            },
        };

        if (searchParam) {
            filter.$or = [
                { regNo: searchParam },
                { fuleingMachine: searchParam },
                { "loadingIncharge.id": searchParam },
                { "loadingIncharge.name": searchParam },
                { "bccAuthorizedOfficer.id": searchParam },
                { "bccAuthorizedOfficer.name": searchParam },
                { fulfilled: searchParam === 'true' || searchParam === true },
            ];
        }

        const sheets = await _find(filter).sort({ createdAt: -1 }).limit(20).lean();

        if (!sheets.length) {
            return res.status(404).json({ error: 'No Sheets found', filter });
        }

        res.status(200).json(sheets);
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/sheets/get', startDate: req?.body?.startDate, endDate: req?.body?.endDate, searchParam: req?.body?.searchParam });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.get('/sheets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sheet = await findOne({ _id: new mongoose.Types.ObjectId(id) }).lean();
        if (!sheet) {
            return res.status(404).json({ error: 'No Sheets found' });
        }
        res.status(200).json(sheet);
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/sheets/:id', sheetId: req?.params?.id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

// Update a LoadingSheet (PATCH)
router.patch('/sheets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || !updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Missing or invalid fields for update' }));
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid sheet id' }));
        }

        const updatedSheet = await withTransaction(async (sessions) => {
            const updated = await _findByIdAndUpdate(
                new mongoose.Types.ObjectId(id),
                updateData,
                { new: true, runValidators: true, session: sessions.bowsers }
            );
            if (!updated) {
                const e = new Error('LoadingSheet not found');
                e.name = 'ValidationError';
                throw e;
            }
            return updated;
        }, { connections: ['bowsers'], context: { route: '/sheets/:id', sheetId: id } });

        res.status(200).json(updatedSheet);
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/sheets/:id', sheetId: req?.params?.id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

// Delete a LoadingSheet (DELETE)
router.delete('/sheet/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Missing required id for deletion' }));
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid sheet id' }));
        }

        const deletedSheet = await withTransaction(async (sessions) => {
            const del = await _findByIdAndDelete(new mongoose.Types.ObjectId(id), { session: sessions.bowsers });
            if (!del) {
                const e = new Error('LoadingSheet not found');
                e.name = 'ValidationError';
                throw e;
            }
            return del;
        }, { connections: ['bowsers'], context: { route: '/sheet/:id', sheetId: id } });

        res.status(200).json({ message: 'LoadingSheet deleted successfully', deletedSheet });
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/sheet/:id', sheetId: req?.params?.id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

export default router;