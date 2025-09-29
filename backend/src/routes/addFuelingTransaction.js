const express = require('express');
const router = express.Router();
const { FuelingTransaction } = require('../models/Transaction');
const FuelingOrder = require('../models/fuelingOrders');
const FuelRequest = require('../models/FuelRequest');
const { fetchLocationData } = require('../utils/fuelTransactions');
const { updateTripSheet, updateTripSheetBulk } = require('../utils/tripSheet')
const { sendWebPushNotification } = require('../utils/pushNotifications');
const mongoose = require('mongoose');
const { withTransaction, defaultTxnOptions } = require('../utils/transactions');
const { handleTransactionError } = require('../utils/errorHandler');

// Transaction timeout (ms). Can be overridden via env if needed.
const TXN_TIMEOUT_MS = Number(process.env.TXN_TIMEOUT_MS || 35000);
// Preserve helper defaults (majority read/write concerns) and add a supported timeout option
const txnOptions = { ...defaultTxnOptions, maxCommitTimeMS: TXN_TIMEOUT_MS };

router.post('/', async (req, res) => {
    const { tripSheetId } = req.body;
    try {
        // Pre-validation before starting transaction
        const preDoc = new FuelingTransaction(req.body);
        if (!preDoc.gpsLocation || preDoc.gpsLocation.length === 0) {
            return res.status(400).json({ message: 'GPS location not found. Please try again' });
        }

        const coordinates = preDoc.gpsLocation?.split(',');
        let location;
        try {
            location = await fetchLocationData(coordinates?.[0], coordinates?.[1]);
        } catch (e) {
            // swallow geocoder errors and fallback to raw coordinates
            location = undefined;
        }
        const resolvedLocation = location || preDoc.gpsLocation;

        // We will create a fresh document inside the transaction to avoid reusing across retries
        let savedTransaction; // capture for post-commit notifications

        // Execute all DB operations in one transaction on bowsers connection
        const ac = new AbortController();
        const txnPromise = withTransaction(async (sessions) => {
            // Fresh instance per attempt
            const fuelingTransaction = new FuelingTransaction({ ...req.body, gpsLocation: resolvedLocation });
            // Save fueling transaction inside txn
            await fuelingTransaction.save({ session: sessions.bowsers });

            // Update trip sheet with session
            const tripUpdate = await updateTripSheet({ tripSheetId: fuelingTransaction.tripSheetId, newDispense: fuelingTransaction, session: sessions.bowsers });
            if (!tripUpdate?.success) {
                const err = new Error(tripUpdate?.message || 'Failed to update trip sheet');
                err.details = tripUpdate?.error;
                throw err;
            }

            // Update fueling order if applicable
            if (fuelingTransaction.orderId) {
                const fuelingOrder = await FuelingOrder.findById(new mongoose.Types.ObjectId(fuelingTransaction.orderId)).session(sessions.bowsers);
                if (fuelingOrder) {
                    fuelingOrder.fulfilled = true;
                    await fuelingOrder.save({ session: sessions.bowsers });
                }
            }
            // Store for post-commit side-effects
            savedTransaction = fuelingTransaction;
            return { ok: true };
    }, { connections: ['bowsers'], txnOptions, context: { route: 'addFuelingTransaction.POST' }, signal: ac.signal });

        // Enforce an overall timeout for the transaction block
        let timeoutId;
        try {
            await Promise.race([
                txnPromise,
                new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        const e = new Error('Transaction timed out');
                        e.code = 'TXN_TIMEOUT';
                        ac.abort();
                        reject(e);
                    }, TXN_TIMEOUT_MS);
                })
            ]);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }

        // Only after commit: send notifications (non-transactional)
        try {
            const transactionWithoutImages = savedTransaction?.toObject ? savedTransaction.toObject() : {};
            delete transactionWithoutImages.fuelMeterImage;
            delete transactionWithoutImages.vehicleNumberPlateImage;
            console.log('created fuel transaction: ', transactionWithoutImages);

            let primaryHead = savedTransaction?.category == "Bulk Sale" ? `Party: ${savedTransaction?.party}` : `Vehicle Number: ${savedTransaction?.vehicleNumber}`;
            let midHead = savedTransaction?.category == "Attatch" ? `Vendor: ${savedTransaction?.party}\n` : ``;
            let secondaryHead = savedTransaction?.category == "Bulk Sale" ? `` : `Driver: ${savedTransaction?.driverName}\n`;
            let headEnd = `was done by: ${savedTransaction?.bowser?.driver?.name}\nLocation: ${resolvedLocation} at: ${savedTransaction?.fuelingDateTime}`;
            let userId = savedTransaction?.allocationAdmin?.id;
            let message = `Order to:\n${primaryHead}\n${midHead}${secondaryHead}${headEnd}`
            let options = {
                title: "Your Order has been fulfilled successfully",
                data: { url: `/dispense-records/${savedTransaction?._id?.toString()}` }
            };
            if (userId && userId.length > 2) await sendWebPushNotification({ userId, message, options });
        } catch (notifyErr) {
            // Log and continue; notifications do not affect response
            console.warn('Notification dispatch failed:', notifyErr?.message);
        }

        return res.status(200).json({ message: 'Data Submitted successfully' });
    } catch (err) {
        if (err?.code === 'TXN_TIMEOUT' || /timed out/i.test(String(err?.message))) {
            return res.status(504).json({ message: 'The request timed out. Please try again later.' });
        }
        const errorBody = handleTransactionError(err, { route: 'addFuelingTransaction.POST' });
        return res.status(errorBody.status || 500).json(errorBody);
    }
});

router.put('/update-from-driver/:id', async (req, res) => {
    const { id } = req.params;
    const { odometer, fuelQuantity, allocationType, orderId, tripId } = req.body;
    try {
        let fuelingTransaction;
        const ac = new AbortController();
        const txnPromise = withTransaction(async (sessions) => {
            // Read inside the transaction to avoid stale state
            const fuelRequest = await FuelRequest.findById(id).populate('allocation').session(sessions.bowsers);
            if (!fuelRequest) {
                const err = new Error('Fuel request not found');
                err.status = 404;
                throw err;
            }
            const allocation = fuelRequest.allocation;
            if (!allocation) {
                const err = new Error('Allocation not found on fuel request');
                err.status = 400;
                throw err;
            }
            if (!orderId) {
                const err = new Error('orderId is required');
                err.status = 400;
                throw err;
            }

            fuelingTransaction = new FuelingTransaction({
                orderId: allocation._id,
                trip: tripId,
                category: allocation.category,
                party: allocation.party,
                odometer,
                vehicleNumber: fuelRequest.vehicleNumber,
                driverId: fuelRequest.driverId,
                driverName: fuelRequest.driverName,
                driverMobile: fuelRequest.driverMobile,
                quantityType: allocation.quantityType,
                fuelQuantity,
                location: allocation.pumpLocation || allocation.fuelProvider,
                fuelingDateTime: new Date(),
                verified: { status: true },
                allocationType: allocationType || 'Fuel Request',
                orderId,
                allocationAdmin: allocation.allocationAdmin,
            });

            const fuelingOrder = await FuelingOrder.findById(orderId).session(sessions.bowsers);
            if (fuelingOrder) {
                fuelingOrder.fuelQuantity = fuelQuantity;
                fuelingOrder.fulfilled = true;
                await fuelingOrder.save({ session: sessions.bowsers });
            }
            await fuelingTransaction.save({ session: sessions.bowsers });
    }, { connections: ['bowsers'], txnOptions, context: { route: 'addFuelingTransaction.PUT.update-from-driver' }, signal: ac.signal });

        let timeoutId;
        try {
            await Promise.race([
                txnPromise,
                new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        const e = new Error('Transaction timed out');
                        e.code = 'TXN_TIMEOUT';
                        ac.abort();
                        reject(e);
                    }, TXN_TIMEOUT_MS);
                })
            ]);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }

        return res.status(200).json({ message: 'Fueling transaction created successfully', fuelingTransaction });
    } catch (err) {
        if (err?.code === 'TXN_TIMEOUT' || /timed out/i.test(String(err?.message))) {
            return res.status(504).json({ message: 'The request timed out. Please try again later.' });
        }
        const errorBody = handleTransactionError(err, { route: 'addFuelingTransaction.PUT.update-from-driver' });
        return res.status(errorBody.status || 500).json(errorBody);
    }
});

router.post('/bulk', async (req, res) => {
    try {
        const fuelingTransactions = req.body;
        if (!Array.isArray(fuelingTransactions) || fuelingTransactions.length === 0) {
            return res.status(400).json({ message: 'No transactions provided' });
        }
        const tripSheetId = fuelingTransactions[0].tripSheetId;

        const ac = new AbortController();
        const txnPromise = withTransaction(async (sessions) => {
            // Save all transactions with session and collect saved docs
            const savedDocs = [];
            for (const data of fuelingTransactions) {
                const doc = new FuelingTransaction(data);
                await doc.save({ session: sessions.bowsers });
                // Enrich for trip sheet linkage
                const plain = doc.toObject();
                delete plain.fuelMeterImage;
                delete plain.vehicleNumberPlateImage;
                savedDocs.push({
                    ...plain,
                    _id: doc._id,
                    transaction: doc._id,
                });
            }
            // Update trip sheet in bulk with enriched docs
            const bulkUpdate = await updateTripSheetBulk({ tripSheetId, dispenses: savedDocs, session: sessions.bowsers });
            if (!bulkUpdate?.success) {
                const err = new Error(bulkUpdate?.message || 'Failed to update trip sheet in bulk');
                err.details = bulkUpdate?.error;
                throw err;
            }
            return { ok: true };
        }, { connections: ['bowsers'], txnOptions, context: { route: 'addFuelingTransaction.POST.bulk' }, signal: ac.signal });

        let timeoutId;
        try {
            await Promise.race([
                txnPromise,
                new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        const e = new Error('Transaction timed out');
                        e.code = 'TXN_TIMEOUT';
                        ac.abort();
                        reject(e);
                    }, TXN_TIMEOUT_MS);
                })
            ]);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }

        return res.status(200).json({ message: 'Bulk Data Submitted successfully' });
    } catch (err) {
        if (err?.code === 'TXN_TIMEOUT' || /timed out/i.test(String(err?.message))) {
            return res.status(504).json({ message: 'The request timed out. Please try again later.' });
        }
        const errorBody = handleTransactionError(err, { route: 'addFuelingTransaction.POST.bulk' });
        return res.status(errorBody.status || 500).json(errorBody);
    }
});

module.exports = router;