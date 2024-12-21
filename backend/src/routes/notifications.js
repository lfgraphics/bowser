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
        let allRecipients = [];

        // Fetch recipients from specified groups
        if (groups && Array.isArray(groups) && groups.length > 0) {
            const groupRecipients = await PushSubscription.find({
                groups: { $in: groups },
            }).select('mobileNumber userId -_id'); // Fetch only mobileNumber and userId fields

            // Add group recipients to the list
            allRecipients.push(...groupRecipients.map((rec) => ({
                mobileNumber: rec.mobileNumber,
                userId: rec.userId,
            })));
        }

        // Add directly specified recipients
        if (recipients && Array.isArray(recipients) && recipients.length > 0) {
            allRecipients.push(...recipients);
        }

        if (allRecipients.length === 0) {
            return res.status(400).json({ error: 'No recipients found for the specified groups or recipients.' });
        }

        let results = [];
        let errors = [];

        // Process each recipient
        for (const recipient of allRecipients) {
            const { mobileNumber, userId } = recipient;

            if (!mobileNumber && !userId) {
                errors.push({ recipient, error: 'Missing mobileNumber or userId.' });
                continue;
            }

            try {
                let result;
                if (platform === 'web') {
                    result = await sendWebPushNotification(userId, message, options);
                } else if (platform === 'native') {
                    result = await sendNativePushNotification({ mobileNumber, message, options });
                } else {
                    errors.push({ recipient, error: 'Invalid platform specified.' });
                    continue;
                }

                if (result.success) {
                    results.push({ recipient, result });
                } else {
                    errors.push({ recipient, error: result.error });
                }
            } catch (error) {
                errors.push({ recipient, error: error.message });
            }
        }

        res.status(200).json({ success: true, results, errors });
    } catch (error) {
        console.error('Error sending bulk notifications:', error.message);
        res.status(500).json({ error: 'Failed to send bulk notifications.' });
    }
});

module.exports = router;
