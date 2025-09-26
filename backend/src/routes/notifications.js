const express = require('express');
const router = express.Router();
const PushSubscription = require('../models/pushSubscription');
const { sendWebPushNotification, sendNativePushNotification, sendBulkNotifications, registerSubscription } = require('../utils/pushNotifications');

// Register subscription (web or native)
router.post('/register', async (req, res) => {
    const { mobileNumber, userId, subscription, platform, groups } = req.body;

    try {
        const updatedSubscription = await registerSubscription({ mobileNumber, userId, subscription, platform, groups });
        res.status(200).json({ success: true, message: 'Subscription registered successfully.', data: updatedSubscription });
    } catch (error) {
        console.error('Error registering subscription:', error);
        res.status(500).json({ message: error.message || 'Failed to register subscription.' });
    }
});

// Unregister subscription
router.post('/unregister', async (req, res) => {
    const { mobileNumber, userId, platform } = req.body;

    if ((!userId && !mobileNumber) || !platform) {
        return res.status(400).json({ message: 'Mobile number and platform are required.' });
    }

    try {
        if (mobileNumber) await PushSubscription.deleteOne({ mobileNumber, platform });
        if (userId) await PushSubscription.deleteOne({ userId, platform });
        res.status(200).json({ success: true, message: 'Subscription unregistered successfully.' });
    } catch (error) {
        console.error('Error unregistering subscription:', error);
        res.status(500).json({ message: 'Failed to unregister subscription.' });
    }
});

// Get notification data
router.post('/', async (req, res) => {
    const { phoneNo, userId, platform } = req.body;

    if (!userId && !phoneNo) {
        return res.status(400).json({ message: 'Mobile number and platform are required.' });
    }

    try {
        if (phoneNo) {
            let sucscription = await PushSubscription.find({ mobileNumber: phoneNo, ...(platform ? { platform } : {}), })
            res.status(200).json(sucscription);
        } else {
            let sucscription = await PushSubscription.find({ userId })
            res.status(200).json(sucscription);
        }
    } catch (error) {
        console.error('Error unregistering subscription:', error);
        res.status(500).json({ message: 'Failed to unregister subscription.' });
    }
});

// Send notification
router.post('/send', async (req, res) => {
    const { mobileNumber, userId, message, platform, options } = req.body;

    if ((!mobileNumber && !userId) || !message || !platform) {
        return res.status(400).json({ message: 'Mobile number/UserId, message, and platform are required.' });
    }

    try {
        let result;
        if (platform === 'web') {
            result = await sendWebPushNotification({ userId, message, options });
        } else if (platform === 'native') {
            result = await sendNativePushNotification({ mobileNumber, message, options });
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
        res.status(500).json({ message: 'Failed to send notification.' });
    }
});

router.post('/bulk-send', async (req, res) => {
    const { groups, recipients, message, platform, options } = req.body;

    if ((!groups && (!recipients || !Array.isArray(recipients))) || !message || !platform) {
        return res.status(400).json({ message: 'Groups, recipients array, message, and platform are required.' });
    }

    try {
        const { results, errors } = await sendBulkNotifications({ groups, recipients, message, platform, options });
        res.status(200).json({ success: true, results, errors });
    } catch (error) {
        console.error('Error sending bulk notifications:', error);
        res.status(500).json({ message: error.message || 'Failed to send bulk notifications.' });
    }
});

module.exports = router;
