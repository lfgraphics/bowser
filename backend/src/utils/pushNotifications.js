const webpush = require('web-push');
const PushSubscription = require('../models/pushSubscription');
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
        const updatedSubscription = await PushSubscription.findOneAndUpdate(
            { mobileNumber, platform },
            { mobileNumber, userId, subscription, groups, platform },
            { upsert: true, new: true }
        );

        if (!updatedSubscription) {
            console.error(`Failed to register subscription in the database.`);
            throw new Error(`Can't register for notifications`);
        }

        console.log(`Subscription registered successfully in the database:`, updatedSubscription);

        if (platform === "web") {
            console.log(`Sending web push notification...`);
            await sendWebPushNotification({
                userId,
                message: "You will now receive necessary notifications on this device",
                options: {
                    title: "Notification Subscription Successful",
                    url: `/`
                }
            });
            console.log(`Web push notification sent successfully.`);
        }

        if (platform === "native") {
            console.log(`Sending native push notification...`);
            await sendNativePushNotification({
                mobileNumber,
                message: "You will now receive necessary notifications on this device",
                options: { title: "Notification Subscription Successful" }
            });
            console.log(`Native push notification sent successfully.`);
        }

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
    // Ensure at least one of mobileNumber or userId is provided
    if (!mobileNumber && !userId) {
        return { success: false, message: 'Either mobileNumber or userId must be provided.' };
    }

    console.log('sending web push notification to: ',userId, mobileNumber, message);
    try {
        const subscriptionData = await PushSubscription.findOne({
            $or: [
                { userId, platform: 'web' },
                { mobileNumber, platform: 'web' }
            ]
        });

        if (!subscriptionData || !subscriptionData.subscription) {
            return { success: false, message: 'No web subscription found for the provided userId or mobile number.' };
        }

        const subscription = subscriptionData.subscription;

        const payload = JSON.stringify({
            title: options.title || 'Notification',
            body: message,
            url: options.url || '/',
            icon: options.icon || '/icon-512x512.png',
        });

        try {
            await webpush.sendNotification(subscription, payload);
            return { success: true, message: 'Web notification sent successfully.' };
        } catch (error) {
            console.error('Failed to send web notification:', error);
            return { success: false, message: 'Failed to send web notification.' };
        }
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
        const subscriptionData = await PushSubscription.findOne({ mobileNumber, platform: 'native' });

        if (!subscriptionData || !subscriptionData.subscription.pushToken) {
            throw new Error('No native subscription found for this mobile number.');
        }

        const pushToken = subscriptionData.subscription.pushToken;

        if (!Expo.isExpoPushToken(pushToken)) {
            throw new Error('Invalid Expo push token.');
        }

        const notification = {
            to: pushToken,
            sound: 'default',
            title: options.title || 'Notification',
            body: message,
            categoryId: "fuelingActions",
            data: options.data || {},
        };

        const response = await expo.sendPushNotificationsAsync([notification]);
        return { success: true, message: 'Native notification sent successfully.', response };
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
        console.ifno('bulk notification recipients: ',groupRecipients)
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
            errors.push({ recipient, error: error.message });
        }
    }

    return { results, errors };
}

module.exports = { sendWebPushNotification, sendNativePushNotification, sendBulkNotifications, registerSubscription };