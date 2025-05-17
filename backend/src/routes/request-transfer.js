const express = require('express');
const router = express.Router();
const RequestTransfer = require('../models/RequestTransfer');
const { sendWebPushNotification } = require('../utils/pushNotifications'); // Import the notification function

// Get all request transfers
router.get('/', async (req, res) => {
    const { searchParam, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    try {
        if (searchParam) {
            const filter = {
                $or: [
                    { by: { $regex: searchParam, $options: "i" } },
                    { to: { $regex: searchParam, $options: "i" } },
                    { 'cancellation.reason': { $regex: searchParam, $options: "i" } },
                    { 'cancellation.by': { $regex: searchParam, $options: "i" } },
                ]
            };
            const requestTransfers = await RequestTransfer.find(filter)
                .sort({ generationTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await RequestTransfer.countDocuments(filter);

            if (requestTransfers.length === 0) {
                return res.status(404).json({
                    title: "Error",
                    message: "No Request Transfer found by the given parameter"
                });
            }

            return res.status(200).json({
                requestTransfers,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / limit)
            });
        } else {
            const requestTransfers = await RequestTransfer.find()
                .sort({ generationTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await RequestTransfer.countDocuments();

            return res.status(200).json({
                requestTransfers,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / limit)
            });
        }
    } catch (error) {
        console.error('Error fetching request transfers:', error);
        return res.status(500).json({ error: 'Failed to fetch request transfers', details: error });
    }
});

// get your transfer requests
router.get('/yours/:id', async (req, res) => {
    const userId = req.params.id;
    const { searchParam, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    try {
        if (searchParam) {
            const filter = {
                $and: [
                    { by: userId },
                    {
                        $or: [
                            { to: { $regex: searchParam, $options: "i" } },
                            { 'cancellation.reason': { $regex: searchParam, $options: "i" } },
                            { 'cancellation.by': { $regex: searchParam, $options: "i" } },
                        ]
                    }
                ]
            };
            const requestTransfers = await RequestTransfer.find(filter)
                .sort({ generationTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await RequestTransfer.countDocuments(filter);

            if (requestTransfers.length === 0) {
                return res.status(404).json({
                    title: "Error",
                    message: "No Request Transfer found by the given parameter"
                });
            }

            return res.status(200).json({
                requestTransfers,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / limit)
            });
        } else {
            const requestTransfers = await RequestTransfer.find({ by: userId })
                .sort({ generationTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await RequestTransfer.countDocuments({ by: userId });

            return res.status(200).json({
                requestTransfers,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / limit)
            });
        }
    } catch (error) {
        console.error('Error fetching request transfers:', error);
        return res.status(500).json({ error: 'Failed to fetch request transfers', details: error });
    }
});

// get requests to you
router.get('/to-you/:id', async (req, res) => {
    const userId = req.params.id;
    const { searchParam, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    try {
        if (searchParam) {
            const filter = {
                $and: [
                    { to: userId },
                    {
                        $or: [
                            { by: { $regex: searchParam, $options: "i" } },
                            { 'cancellation.reason': { $regex: searchParam, $options: "i" } },
                            { 'cancellation.by': { $regex: searchParam, $options: "i" } },
                        ]
                    }
                ]
            };
            const requestTransfers = await RequestTransfer.find(filter)
                .sort({ generationTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await RequestTransfer.countDocuments(filter);

            if (requestTransfers.length === 0) {
                return res.status(404).json({
                    title: "Error",
                    message: "No Request Transfer found by the given parameter"
                });
            }

            return res.status(200).json({
                requestTransfers,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / limit)
            });
        } else {
            const requestTransfers = await RequestTransfer.find({ to: userId })
                .sort({ generationTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await RequestTransfer.countDocuments({ to: userId });

            return res.status(200).json({
                requestTransfers,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / limit)
            });
        }
    } catch (error) {
        console.error('Error fetching request transfers:', error);
        return res.status(500).json({ error: 'Failed to fetch request transfers', details: error });
    }
});

// get one transfer request by id
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const requestTransfer = await RequestTransfer.findById(id).lean();
        if (!requestTransfer) {
            return res.status(404).json({
                title: "Error",
                message: "No Request Transfer found by the given id"
            });
        }
        return res.status(200).json(requestTransfer);
    } catch (error) {
        console.error('Error fetching request transfer:', error);
        return res.status(500).json({ error: 'Failed to fetch request transfer', details: error });
    }
});

// update something in a transfer request
router.patch('/:id', async (req, res) => {
    const id = req.params.id;
    const { by, to, accepted, cancellation } = req.body;
    try {
        const requestTransfer = await RequestTransfer.findByIdAndUpdate(id, { by, to, accepted, cancellation }, { new: true }).lean();
        if (!requestTransfer) {
            return res.status(404).json({
                title: "Error",
                message: "No Request Transfer found by the given id"
            });
        }

        // Send notification to the "to" user
        if (to) {
            await sendWebPushNotification({
                userId: to,
                message: `The request transfer has been updated.`,
                options: { title: "Transfer Request Updated", url: `/fuel-request` }
            });
        }

        return res.status(200).json(requestTransfer);
    } catch (error) {
        console.error('Error updating request transfer:', error);
        return res.status(500).json({ error: 'Failed to update request transfer', details: error });
    }
});

router.post('/create', async (req, res) => {
    const { by, to, transferReason } = req.body;
    if (!by || !to) {
        return res.status(400).json({ error: "'by' and 'to' are required" });
    }
    try {
        const requestTransfer = new RequestTransfer({ by, to, transferReason });
        await requestTransfer.save();

        // Send notification to the "to" user
        await sendWebPushNotification({
            userId: to,
            message: `You have received a new Fuel requests transfer - accept request\nBy: ${by}\nReason: ${transferReason}`,
            options: { title: "New Request Transfer", url: `/fuel-request` }
        });

        return res.status(201).json(requestTransfer);
    } catch (error) {
        console.error('Error creating request transfer:', error);
        return res.status(500).json({ error: 'Failed to create request transfer', details: error });
    }
});

// Accept a request transfer
router.patch('/accept/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const requestTransfer = await RequestTransfer.findByIdAndUpdate(id, { accepted: true }, { new: true }).lean();
        if (!requestTransfer) {
            return res.status(404).json({
                title: "Error",
                message: "No Request Transfer found by the given id"
            });
        }

        // Notify the "by" user
        await sendWebPushNotification({
            userId: requestTransfer.by,
            message: `Your transfer request has been accepted.`,
            options: { title: "Transfer Request Accepted", url: `/fuel-request` }
        });

        return res.status(200).json(requestTransfer);
    } catch (error) {
        console.error('Error accepting request transfer:', error);
        return res.status(500).json({ error: 'Failed to accept request transfer', details: error });
    }
});

// Reject a request transfer
router.patch('/reject/:id', async (req, res) => {
    const id = req.params.id;
    const { reason, by } = req.body;
    try {
        const requestTransfer = await RequestTransfer.findByIdAndUpdate(id, { accepted: false, cancellation: { reason, by } }, { new: true }).lean();
        if (!requestTransfer) {
            return res.status(404).json({
                title: "Error",
                message: "No Request Transfer found by the given id"
            });
        }

        // Notify the "by" user
        await sendWebPushNotification({
            userId: requestTransfer.by,
            message: `Your transfer request has been rejected.\nReason: ${reason}`,
            options: { title: "Transfer Request Rejected", url: `/fuel-request` }
        });

        return res.status(200).json(requestTransfer);
    } catch (error) {
        console.error('Error rejecting request transfer:', error);
        return res.status(500).json({ error: 'Failed to reject request transfer', details: error });
    }
});

// Delete a request transfer
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const requestTransfer = await RequestTransfer.findByIdAndDelete(id).lean();
        if (!requestTransfer) {
            return res.status(404).json({
                title: "Error",
                message: "No Request Transfer found by the given id"
            });
        }

        // Notify the "to" user
        await sendWebPushNotification({
            userId: requestTransfer.to,
            message: `A transfer request has been deleted.\nwas Requested By: ${requestTransfer.by}\nDate: ${requestTransfer.generationTime}`,
            options: { title: "Transfer Request Deleted", url: `/fuel-request` }
        });

        return res.status(200).json(requestTransfer);
    } catch (error) {
        console.error('Error deleting request transfer:', error);
        return res.status(500).json({ error: 'Failed to delete request transfer', details: error });
    }
});

router.get('/mark-fulfilled/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const requestTransfer = await RequestTransfer.findByIdAndUpdate(id, { fulfilled: true }, { new: true }).lean();
        if (!requestTransfer) {
            return res.status(404).json({
                title: "Error",
                message: "No Request Transfer found by the given id"
            });
        }

        // Notify the "by" user
        await sendWebPushNotification({
            userId: requestTransfer.by,
            message: `Your request transfer has been marked as fulfilled.`,
            options: { title: "Request Transfer Fulfilled" }
        });

        return res.status(200).json(requestTransfer);
    } catch (error) {
        console.error('Error marking request transfer as fulfilled:', error);
        return res.status(500).json({ error: 'Failed to mark request transfer as fulfilled', details: error });
    }
});

module.exports = router;
