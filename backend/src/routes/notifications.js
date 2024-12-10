const express = require('express');
const router = express.Router();
const { sendPushNotification } = require('../utils/pushNotifications');
const PushSubscription = require('../models/pushSubscription');

// Route to register a push subscription
router.post('/register', async (req, res) => {
    const { mobileNumber, subscription } = req.body;

    if (!mobileNumber || !subscription) {
        return res.status(400).json({ error: 'Mobile number and subscription are required.' });
    }

    try {
        const result = await PushSubscription.findOneAndUpdate(
            { mobileNumber },
            { mobileNumber, subscription, platform: 'web', createdAt: new Date() },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true, message: 'Subscription registered successfully.', data: result });
    } catch (error) {
        console.error('Error registering subscription:', error);
        res.status(500).json({ error: 'Failed to register subscription.' });
    }
});

// Route to unregister a push subscription
router.post('/unregister', async (req, res) => {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
        return res.status(400).json({ error: 'Mobile number is required.' });
    }

    try {
        await PushSubscription.deleteOne({ mobileNumber });
        res.status(200).json({ success: true, message: 'Subscription unregistered successfully.' });
    } catch (error) {
        console.error('Error unregistering subscription:', error);
        res.status(500).json({ error: 'Failed to unregister subscription.' });
    }
});

// Route to send a push notification
router.post('/send', async (req, res) => {
    const { mobileNumber, message } = req.body;

    if (!mobileNumber || !message) {
        return res.status(400).json({ error: 'Mobile number and message are required.' });
    }

    const result = await sendPushNotification(mobileNumber, message);
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(500).json(result);
    }
});

module.exports = router;
