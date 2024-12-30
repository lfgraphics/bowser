const express = require('express');
const router = express.Router();
const PushSubscription = require('../models/pushSubscription');
const { sendWebPushNotification, sendNativePushNotification, sendBulkNotifications } = require('../utils/pushNotifications');

// Register subscription (web or native)
router.post('/register', async (req, res) => {
    const { mobileNumber, userId, subscription, platform, groups } = req.body;
    console.log(mobileNumber, platform, subscription)

    if (!mobileNumber || !subscription || !platform) {
        return res.status(400).json({ error: 'Mobile number, subscription, and platform are required.' });
    }

    try {
        const updatedSubscription = await PushSubscription.findOneAndUpdate(
            { mobileNumber, platform },
            { mobileNumber, userId, subscription, groups, platform },
            { upsert: true, new: true }
        );

        if (!updatedSubscription) { throw new Error(`can't register for notificatio`) } else {
            if (platform == "web") sendWebPushNotification({
                userId, message: "You will now recieve necessar notifications on this device", options: options = {
                    title: "Notification Subscription Successfull",
                    url: `/`
                }
            }
            )
            if (platform == "native") sendNativePushNotification({ mobileNumber, message: "You will now recieve necessar notifications on this device", options: options = { title: "Notification Subscription Successfull", } })
        }

        res.status(200).json({ success: true, message: 'Subscription registered successfully.', data: updatedSubscription });
    } catch (error) {
        console.error('Error registering subscription:', error);
        res.status(500).json({ error: 'Failed to register subscription.' });
    }
});

// Unregister subscription
router.post('/unregister', async (req, res) => {
    const { mobileNumber, userId, platform } = req.body;
    console.log("unregistering", mobileNumber, userId)

    if ((!userId && !mobileNumber) || !platform) {
        return res.status(400).json({ error: 'Mobile number and platform are required.' });
    }

    try {
        if (mobileNumber) await PushSubscription.deleteOne({ mobileNumber, platform });
        if (userId) await PushSubscription.deleteOne({ userId, platform });
        res.status(200).json({ success: true, message: 'Subscription unregistered successfully.' });
    } catch (error) {
        console.error('Error unregistering subscription:', error);
        res.status(500).json({ error: 'Failed to unregister subscription.' });
    }
});

router.get('/', async (req, res) => {
    const { mobileNumber, userId } = req.body;

    if (!userId && !mobileNumber) {
        return res.status(400).json({ error: 'Mobile number and platform are required.' });
    }

    try {
        if (mobileNumber) {
            let sucscription = await PushSubscription.find({ mobileNumber })
            res.status(200).json(sucscription);
        } else {
            let sucscription = await PushSubscription.find({ userId })
            res.status(200).json(sucscription);
        }
    } catch (error) {
        console.error('Error unregistering subscription:', error);
        res.status(500).json({ error: 'Failed to unregister subscription.' });
    }
});

// Send notification
router.post('/send', async (req, res) => {
    const { mobileNumber, userId, message, platform, options } = req.body;

    if ((!mobileNumber && !userId) || !message || !platform) {
        return res.status(400).json({ error: 'Mobile number/UserId, message, and platform are required.' });
    }

    try {
        let result;
        if (platform === 'web') {
            result = await sendWebPushNotification(userId, message, options);
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

router.post('/bulk-send', async (req, res) => {
    const { groups, recipients, message, platform, options } = req.body;

    if ((!groups && (!recipients || !Array.isArray(recipients))) || !message || !platform) {
        return res.status(400).json({ error: 'Groups, recipients array, message, and platform are required.' });
    }

    try {
        const { results, errors } = await sendBulkNotifications(groups, recipients, message, platform, options);

        res.status(200).json({ success: true, results, errors });
    } catch (error) {
        console.error('Error sending bulk notifications:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
