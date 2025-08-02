const webpush = require('web-push');
const PushSubscription = require('../models/pushSubscription');
const RequestTransfer = require('../models/RequestTransfer');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// VAPID keys setup
webpush.setVapidDetails(
    'mailto:itplfirebase@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

async function registerSubscription({ mobileNumber, userId, subscription, platform, groups }) {
    try {
        console.log(`Registering subscription for mobileNumber: ${mobileNumber}, userId: ${userId}, platform: ${platform}`);

        if (!mobileNumber || !subscription || !platform) {
            throw new Error('Mobile number or userId, subscription, and platform are required.');
        }

        console.log(`Checking database for existing subscription or inserting a new one...`);
        const updatedSubscription = await PushSubscription.create({ mobileNumber, userId, subscription, groups, platform });

        if (!updatedSubscription) {
            console.error(`Failed to register subscription in the database.`);
            throw new Error(`Can't register for notifications`);
        }

        console.log(`Subscription registered successfully in the database:`, updatedSubscription);

        return updatedSubscription;
    } catch (error) {
        console.error(`Error during subscription registration: ${error.message}`, {
            mobileNumber,
            userId,
            subscription,
            platform,
            groups,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Send a push notification to a user.
 * @param {string} mobileNumber - The mobile number of the user.
 * @param {string} userId - The userId of the user.
 * @param {string} message - The notification message to send.
 * @param {object} [options] - Optional parameters for the notification (e.g., title, icon).
 * @returns {Promise<object>} - A promise that resolves with the result of the notification sending.
 */
async function sendWebPushNotification({ mobileNumber, userId, message, options = {} }) {
    if (!mobileNumber && !userId) {
        return { success: false, message: 'Either mobileNumber or userId must be provided.' };
    }

    try {
        // Find ALL subscriptions for this user/mobile/platform
        const subscriptions = await PushSubscription.find({
            $or: [
                { userId, platform: 'web' },
                { mobileNumber, platform: 'web' }
            ]
        }).sort({ _id: -1 });

        if (!subscriptions.length) {
            return { success: false, message: 'No web subscriptions found for the provided userId or mobile number.' };
        }

        const payload = JSON.stringify({
            title: options.title || 'Notification',
            body: message,
            url: options.url || '/',
            icon: options.icon || '/icon-512x512.png',
            id: options.id,
        });

        let results = [];
        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification(sub.subscription, payload);
                results.push({ success: true, subscription: sub });
            } catch (error) {
                console.error('Failed to send web notification:', error);
                results.push({ success: false, error: error.message, subscription: sub });
            }
        }
        return { success: true, results };
    } catch (error) {
        console.error('Error sending web push notification:', error.message);
        return { success: false, error };
    }
}

/**
 * Send Native Push Notification
 * @param {string} mobileNumber - The mobile number of the user.
 * @param {string} message - The notification message to send.
 * @param {object} [options] - Optional parameters for the notification (e.g., title, icon).
 */
async function sendNativePushNotification({ mobileNumber, message, options = {} }) {
    try {
        // Find ALL native subscriptions for this mobile number
        const subscriptions = await PushSubscription.find({ mobileNumber, platform: 'native' });

        if (!subscriptions.length) {
            throw new Error('No native subscriptions found for this mobile number.');
        }

        let results = [];
        for (const sub of subscriptions) {
            const pushToken = sub.subscription.pushToken;
            if (!Expo.isExpoPushToken(pushToken)) {
                results.push({ success: false, error: 'Invalid Expo push token.', subscription: sub });
                continue;
            }

            const notification = {
                to: pushToken,
                sound: 'default',
                title: options.title || 'Notification',
                body: message,
                categoryId: "fuelingActions",
                data: options.data || {},
            };

            try {
                const response = await expo.sendPushNotificationsAsync([notification]);
                results.push({ success: true, response, subscription: sub });
            } catch (error) {
                results.push({ success: false, error: error.message, subscription: sub });
            }
        }
        return { success: true, results };
    } catch (error) {
        console.error('Error sending native push notification:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send notifications to recipients from groups or directly specified recipients.
 * @param {Array} groups - Array of group names.
 * @param {Array} recipients - Array of directly specified recipients.
 * @param {string} message - The message to send.
 * @param {string} platform - The platform ('web' or 'native').
 * @param {object} options - Additional options for notifications (e.g., title, icon, etc.).
 * @returns {Promise<object>} - Results of notifications sent and errors.
 */
async function sendBulkNotifications({ groups = [], recipients = [], message, platform, options = {} }) {
    if (!message || !platform) {
        throw new Error('Message and platform are required.');
    }

    let allRecipients = [];

    // Fetch recipients from specified groups
    if (groups && Array.isArray(groups) && groups.length > 0) {
        const groupRecipients = await PushSubscription.find({
            groups: { $in: groups },
        }).select('mobileNumber userId -_id'); // Fetch only mobileNumber and userId fields
        console.log('bulk notification recipients: ', groupRecipients)
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

    // Deduplicate recipients (by mobileNumber or userId)
    allRecipients = [
        ...new Map(
            allRecipients.map((item) => [item.mobileNumber || item.userId, item])
        ).values(),
    ];

    if (allRecipients.length === 0) {
        return
    }

    // Initialize results and errors
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
                result = await sendWebPushNotification({ userId, message, options });
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
            errors.push({ recipient, error });
        }
    }

    return { results, errors };
}


/**
 * Checks if a user's work is actively transferred to someone else.
 * @param {string} userId - The user ID to check.
 * @returns {Promise[string]} - The ID's of the persons to whom it's transferred, or the original userId.
 */
async function getActiveTransferTargetUserId(userId) {
    try {
        const transfers = await RequestTransfer.find({
            by: userId,
            accepted: true,
            fulfilled: false,
            $or: [
                { cancellation: { $exists: false } },
                { 'cancellation.time': { $exists: false } },
                { cancellation: null },
            ]
        }).sort({ generationTime: -1 }).lean();
        if (transfers && transfers.length > 0) {
            return transfers.map(transfer => transfer.to);
        }

        return [userId];
    } catch (error) {
        console.error('Error checking transfer status:', error);
        // You might choose to throw, return null, or return original userId
        return [userId];
    }
}


module.exports = { sendWebPushNotification, sendNativePushNotification, sendBulkNotifications, registerSubscription, getActiveTransferTargetUserId };