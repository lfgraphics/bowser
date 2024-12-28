const express = require('express');
const router = express.Router();
const LoadingOrder = require('../models/LoadingOrder');
const LoadingSheet = require('../models/LoadingSheet')
const { sendBulkNotifications, sendWebPushNotification } = require('../utils/pushNotifications');
const { default: mongoose } = require('mongoose');
const Bowsers = require('../models/Bowsers');

// Create a new LoadingOrder
router.post('/orders', async (req, res) => {
    try {
        const { regNo, loadingDesc, loadingLocation, bccAuthorizedOfficer } = req.body;
        console.log(req.body)

        if (!regNo || !loadingLocation || !bccAuthorizedOfficer || !bccAuthorizedOfficer.id || !bccAuthorizedOfficer.name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newBowserLoadingOrder = new LoadingOrder({
            regNo,
            loadingDesc,
            loadingLocation,
            bccAuthorizedOfficer: {
                id: bccAuthorizedOfficer.id,
                name: bccAuthorizedOfficer.name,
            },
            fulfilled: false,
        });

        try {
            let desc = loadingDesc ? `\nDescription: ${loadingDesc}` : ""
            await newBowserLoadingOrder.save();
            await sendBulkNotifications({
                groups: ["loadingIncharge"],
                message: `Bowser: ${regNo}\nLoad the bowser from: ${loadingLocation}${desc}\nOrdered by: ${bccAuthorizedOfficer.name} Id: ${bccAuthorizedOfficer.id}`,
                options: {
                    title: "New Bowser Loading Order Arrived",
                    url: `/loading/sheet/${newBowserLoadingOrder._id}`,
                },
                platform: "web",
            });
            res.status(201).json(newBowserLoadingOrder);
        } catch (error) {
            console.error("Error saving LoadingOrder or sending notification:", error);
            res.status(500).json({ error: 'Failed to create and notify LoadingOrder', details: error.message });
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
        const bowser = await Bowsers.findOne({ regNo: loadingOrder.regNo }).lean();

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
        const { startDate, endDate, searchParam } = req.body;

        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 30);
        const defaultEndDate = new Date();

        const filter = {
            createdAt: {
                $gte: startDate && startDate !== null ? new Date(startDate) : defaultStartDate,
                $lte: endDate && endDate !== null ? new Date(endDate) : defaultEndDate,
            },
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

router.delete('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Missing required id for deletion' });
        }

        const deletedOrder = await LoadingOrder.findByIdAndDelete({ _id: ObjectId(id) });

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
        const {
            regNo,
            odoMeter,
            fuleingMachine,
            pumpReadingBefore,
            pumpReadingAfter,
            chamberwiseDipListBefore,
            chamberwiseDipListAfter,
            chamberwiseSealList,
            pumpSlips,
            loadingIncharge,
            bccAuthorizedOfficer,
        } = req.body;

        // Validate required fields
        const missingFields = [];

        if (!regNo) missingFields.push('regNo');
        if (!odoMeter) missingFields.push('odoMeter');
        if (!fuleingMachine) missingFields.push('fuleingMachine');
        // if (!pumpReadingAfter) missingFields.push('pumpReadingAfter');
        if (!loadingIncharge?.id) missingFields.push('loadingIncharge.id');
        if (!loadingIncharge?.name) missingFields.push('loadingIncharge.name');
        if (!bccAuthorizedOfficer?.orderId) missingFields.push('bccAuthorizedOfficer.orderId');
        if (!bccAuthorizedOfficer?.id) missingFields.push('bccAuthorizedOfficer.id');
        if (!bccAuthorizedOfficer?.name) missingFields.push('bccAuthorizedOfficer.name');

        if (missingFields.length > 0) {
            console.log(req.body);
            console.log(missingFields)
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields: missingFields
            });
        }

        const newLoadingSheet = new LoadingSheet({
            regNo,
            odoMeter,
            fuleingMachine,
            pumpReadingBefore,
            pumpReadingAfter,
            chamberwiseDipListBefore,
            chamberwiseDipListAfter,
            chamberwiseSealList,
            pumpSlips,
            loadingIncharge,
            bccAuthorizedOfficer: {
                ...bccAuthorizedOfficer,
                orderId: new mongoose.Types.ObjectId(bccAuthorizedOfficer.orderId),
            },
            fulfilled: false,
        });

        try {
            // Save the LoadingSheet

            try {
                // Send notification only if save is successful
                const options = {
                    title: "Your Bowser Loading Order is successful",
                    url: `/tripsheets/create/${newLoadingSheet._id}`,
                };
                const message = `Bowser: ${regNo}\nFulfilled by: ${loadingIncharge.name} Id: ${loadingIncharge.id}`;
                let notificationSent = await sendWebPushNotification({ userId: bccAuthorizedOfficer.id, message, options });

                if (notificationSent.success) {
                    await newLoadingSheet.save();
                    // Respond with the saved LoadingSheet
                    res.status(201).json(newLoadingSheet);
                } else { res.status(500).json({ error: 'Request faild couse Faild to send notificaiton to BCC' }) }
            } catch (notificationError) {
                console.error("Error sending notification:", notificationError);

                // Rollback the save operation if notification fails
                await LoadingSheet.findByIdAndDelete(newLoadingSheet._id);

                res.status(500).json({
                    error: 'Failed to send notification. LoadingSheet creation rolled back.',
                    details: notificationError.message,
                });
            }
        } catch (saveError) {
            console.error("Error saving LoadingSheet:", saveError);
            res.status(500).json({
                error: 'Failed to save LoadingSheet',
                details: saveError.message,
            });
        }
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
router.delete('/sheets/:id', async (req, res) => {
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