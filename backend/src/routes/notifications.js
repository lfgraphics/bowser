const express = require('express');
const router = express.Router();
const PushSubscription = require('../models/pushSubscription');
const { sendWebPushNotification, sendNativePushNotification } = require('../utils/pushNotifications');

// Register subscription (web or native)
router.post('/register', async (req, res) => {
    const { mobileNumber, subscription, platform } = req.body;
    console.log(mobileNumber, platform, subscription)

    if (!mobileNumber || !subscription || !platform) {
        return res.status(400).json({ error: 'Mobile number, subscription, and platform are required.' });
    }

    try {
        const updatedSubscription = await PushSubscription.findOneAndUpdate(
            { mobileNumber, platform },
            { mobileNumber, subscription, platform, createdAt: new Date() },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, message: 'Subscription registered successfully.', data: updatedSubscription });
    } catch (error) {
        console.error('Error registering subscription:', error);
        res.status(500).json({ error: 'Failed to register subscription.' });
    }
});

// Unregister subscription
router.post('/unregister', async (req, res) => {
    const { mobileNumber, platform } = req.body;

    if (!mobileNumber || !platform) {
        return res.status(400).json({ error: 'Mobile number and platform are required.' });
    }

    try {
        await PushSubscription.deleteOne({ mobileNumber, platform });
        res.status(200).json({ success: true, message: 'Subscription unregistered successfully.' });
    } catch (error) {
        console.error('Error unregistering subscription:', error);
        res.status(500).json({ error: 'Failed to unregister subscription.' });
    }
});

// Send notification
router.post('/send', async (req, res) => {
    const { mobileNumber, message, platform, options } = req.body;

    if (!mobileNumber || !message || !platform) {
        return res.status(400).json({ error: 'Mobile number, message, and platform are required.' });
    }

    try {
        let result;
        if (platform === 'web') {
            result = await sendWebPushNotification(mobileNumber, message, options);
        } else if (platform === 'native') {
            result = await sendNativePushNotification(mobileNumber, message, options);
        } else {
            return res.status(400).json({ error: 'Invalid platform specified.' });
        }

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error sending notification:', error.message);
        res.status(500).json({ error: 'Failed to send notification.' });
    }
});

module.exports = router;
