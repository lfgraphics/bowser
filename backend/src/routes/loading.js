const express = require('express');
const router = express.Router();
const LoadingOrder = require('../models/LoadingOrder');
const LoadingSheet = require('../models/LoadingSheet')
const { sendBulkNotifications, sendWebPushNotification } = require('../utils/pushNotifications');
const { mongoose } = require('mongoose');
const Bowser = require('../models/Bowsers');
const { updateTripSheet } = require('../utils/tripSheet')
const { calculateQty } = require('../utils/calibration')

// Create a new LoadingOrder
router.post('/orders', async (req, res) => {
    try {
        const { regNo, loadingDesc, loadingLocation, petrolPump, bccAuthorizedOfficer, tripSheetId } = req.body;
        console.inf('Loading order created: ',req.body)

        if (!regNo || !loadingLocation || !bccAuthorizedOfficer || !bccAuthorizedOfficer.id || !bccAuthorizedOfficer.name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newBowserLoadingOrder = new LoadingOrder({
            regNo,
            tripSheetId,
            loadingDesc,
            loadingLocation,
            ...(petrolPump ? { petrolPump } : {}),
            bccAuthorizedOfficer: {
                id: bccAuthorizedOfficer.id,
                name: bccAuthorizedOfficer.name,
            },
            fulfilled: false,
        });

        try {
            let desc = loadingDesc ? `\nDescription: ${loadingDesc}\n` : "";
            let message = `Bowser: ${regNo}\n${desc}Ordered by: ${bccAuthorizedOfficer.name} Id: ${bccAuthorizedOfficer.id}`;
            let options = {
                title: "New Bowser Loading Order Arrived",
                url: `/loading/sheet/${newBowserLoadingOrder._id}`,
            }
            if (loadingLocation === "bcc") {
                await sendBulkNotifications({
                    groups: ["Loading Incharge"],
                    message: message,
                    options: options,
                    platform: "web",
                });
            } else if (loadingLocation === "petrolPump") {
                await sendWebPushNotification({ mobileNumber: petrolPump.phone, message: message, options: options = { title: "New Order Arrived", url: `/loading/petrol-pump/${newBowserLoadingOrder._id}`, } })
            }
            await newBowserLoadingOrder.save();
            res.status(201).json(newBowserLoadingOrder);
        } catch (notificationError) {
            console.error("Error sending notification:", notificationError);
        }
    } catch (err) {
        console.error('Error creating LoadingOrder:', err);
        res.status(400).json({ error: 'Invalid request', details: err.message });
    }
});

router.get('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch the loading order
        const loadingOrder = await LoadingOrder.findById(id).lean();
        if (!loadingOrder) {
            return res.status(404).json({
                title: 'Error',
                details: 'No order found',
            });
        }

        // 2. Fetch the bowser based on regNo
        const bowser = await Bowser.findOne({ regNo: loadingOrder.regNo }).populate('currentTrip').lean();

        // 3. Construct the desired response format
        //    - an array containing a single object
        const responseData = {
            order: loadingOrder,
            bowser: bowser || {},
        };

        // 4. Return the combined results in your desired format
        return res.status(200).json(responseData);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ title: 'Error', details: err.message });
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

        const orders = await LoadingOrder.find(filter).sort({ createdAt: -1 }).limit(20).lean();

        if (!orders.length) {
            return res.status(404).json({ error: 'No Orders found', filter });
        }

        res.status(200).json(orders);
    } catch (err) {
        console.error('Error fetching LoadingOrders:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

// Update a LoadingOrder (PATCH)
router.patch('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Missing required fields for update' });
        }

        const updatedOrder = await LoadingOrder.findByIdAndUpdate({ _id: ObjectId(id) }, updateData, {
            new: true, // Return the updated document
            runValidators: true, // Validate fields
        });

        if (!updatedOrder) {
            return res.status(404).json({ error: 'LoadingOrder not found' });
        }

        res.status(200).json(updatedOrder);
    } catch (err) {
        console.error('Error updating LoadingOrder:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

router.delete('/order/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Missing required id for deletion' });
        }

        const deletedOrder = await LoadingOrder.findByIdAndDelete(id);

        if (!deletedOrder) {
            return res.status(404).json({ error: 'LoadingOrder not found' });
        }

        res.status(200).json({ message: 'LoadingOrder deleted successfully', deletedOrder });
    } catch (err) {
        console.error('Error deleting LoadingOrder:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
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

        // Validate required fields
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
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields: missingFields
            });
        }

        let newLoadingSheet;

        try {
            // Fetch the Bowser document for the provided regNo
            const bowser = await Bowser.findOne({ regNo });
            if (!bowser) {
                return res.status(404).json({ error: 'Bowser not found for the provided regNo' });
            }

            const bowserChambers = bowser.chambers;

            // Calculate qty for chamberwiseDipListBefore
            for (const dip of chamberwiseDipListBefore) {
                if (dip.qty == null || dip.qty === undefined || dip.qty === 0) {
                    dip.qty = calculateQty(bowserChambers, dip.chamberId, dip.levelHeight);
                }
            }

            // Calculate qty for chamberwiseDipListAfter
            for (const dip of chamberwiseDipListAfter) {
                if (dip.qty == null || dip.qty === undefined || dip.qty === 0) {
                    dip.qty = calculateQty(bowserChambers, dip.chamberId, dip.levelHeight);
                }
            }

            // Calculate totalLoadQuantityBySlip
            let totalLoadQuantityBySlip = loadingSlips.reduce((total, slip) => {
                return total + slip.qty;
            }, 0);

            // Calculate totalLoadQuantityByDip based on chamberwiseDipListAfter
            let totalLoadQuantityByDip = chamberwiseDipListAfter.reduce((total, dip) => {
                return total + dip.qty;
            }, 0);


            const totalBefore = chamberwiseDipListBefore.reduce((total, dip) => {
                return total + dip.qty;
            }, 0);

            const tempLoadByDip = totalLoadQuantityBySlip + totalBefore;

            let additionQty = totalLoadQuantityByDip - totalBefore; // Subtract total from before

            if (sheetId) {
                const additionEntry = {
                    sheetId: new mongoose.Types.ObjectId(sheetId),
                    quantityByDip: additionQty,
                    quantityBySlip: totalLoadQuantityBySlip,
                };

                await updateTripSheet({ sheetId, newAddition: additionEntry });
            }

            // try {
            // Send notification only if save is successful
            newLoadingSheet = new LoadingSheet({
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
            });
            const options = {
                title: "Your Bowser Loading Order is successful",
                url: !sheetId ? `/tripsheets/create/${newLoadingSheet?._id}` : `/tripsheets/${sheetId}`,
            };
            const message = `Bowser: ${regNo}\nFulfilled by: ${loadingIncharge.name} Id: ${loadingIncharge.id}`;
            await sendWebPushNotification({ userId: bccAuthorizedOfficer.id, message, options });

            // if (notificationSent.success) {
            if (!sheetId) {
                await newLoadingSheet.save();

            }
            let loadingOrder = await LoadingOrder.findByIdAndUpdate(
                new mongoose.Types.ObjectId(String(bccAuthorizedOfficer.orderId)),
                { $set: { fulfilled: true } },
                { new: true }
            );

            if (!loadingOrder) {
                console.error('Loading order not found');
                return;
            }
            console.info('Updated Loading Order:', loadingOrder);
            res.status(200).json(newLoadingSheet);
            // } else {
            //     res.status(500).json({ error: 'Request failed because failed to send notification to BCC' });
            // }
            // } catch (notificationError) {
            //     console.error("Error sending notification:", notificationError);
            //     await LoadingSheet.findByIdAndDelete(newLoadingSheet._id);
            //     res.status(500).json({
            //         error: 'Failed to send notification. LoadingSheet creation rolled back.',
            //         details: notificationError.message,
            //     });
            // }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Error processing request', details: error.message });
        }

        // Save the LoadingSheet
    } catch (err) {
        console.error('Error creating LoadingSheet:', err);
        res.status(400).json({
            error: 'Invalid request',
            details: err.message,
        });
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

        const sheets = await LoadingSheet.find(filter).sort({ createdAt: -1 }).limit(20).lean();

        if (!sheets.length) {
            return res.status(404).json({ error: 'No Sheets found', filter });
        }

        res.status(200).json(sheets);
    } catch (err) {
        console.error('Error fetching LoadingSheets:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

router.get('/sheets/:id', async (req, res) => {
    try {
        const id = req.params;
        const sheet = await LoadingSheet.findOne({ _id: new mongoose.Types.ObjectId(id) }).lean();

        if (!sheet) {
            return res.status(404).json({ error: 'No Sheets found', filter });
        }

        res.status(200).json(sheet);
    } catch (err) {
        console.error('Error fetching LoadingSheets:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

// Update a LoadingSheet (PATCH)
router.patch('/sheets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Missing required fields for update' });
        }

        const updatedSheet = await LoadingSheet.findByIdAndUpdate(
            { _id: ObjectId(id) },
            updateData,
            {
                new: true, // Return the updated document
                runValidators: true, // Validate fields
            }
        );

        if (!updatedSheet) {
            return res.status(404).json({ error: 'LoadingSheet not found' });
        }

        res.status(200).json(updatedSheet);
    } catch (err) {
        console.error('Error updating LoadingSheet:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

// Delete a LoadingSheet (DELETE)
router.delete('/sheet/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Missing required id for deletion' });
        }

        const deletedSheet = await LoadingSheet.findByIdAndDelete({ _id: ObjectId(id) });

        if (!deletedSheet) {
            return res.status(404).json({ error: 'LoadingSheet not found' });
        }

        res.status(200).json({ message: 'LoadingSheet deleted successfully', deletedSheet });
    } catch (err) {
        console.error('Error deleting LoadingSheet:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

module.exports = router;