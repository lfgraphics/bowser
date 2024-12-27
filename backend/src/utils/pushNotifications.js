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

/**
 * Send a push notification to a user.
 * @param {string} mobileNumber - The mobile number of the user.
 * @param {string} userId - The userId of the user.
 * @param {string} message - The notification message to send.
 * @param {object} [options] - Optional parameters for the notification (e.g., title, icon).
 * @returns {Promise<object>} - A promise that resolves with the result of the notification sending.
 */
async function sendWebPushNotification(userId, message, options = {}) {
    try {
        const subscriptionData = await PushSubscription.findOne({ userId, platform: 'web' });

        if (!subscriptionData || !subscriptionData.subscription) {
            throw new Error('No web subscription found for this mobile number.');
        }

        const subscription = subscriptionData.subscription;

        const payload = JSON.stringify({
            title: options.title || 'Notification',
            body: message,
            url: options.url || 'https://itpl-bowser-admin.vercel.app',
            icon: options.icon || '/icon-512x512.png',
        });

        await webpush.sendNotification(subscription, payload);
        return { success: true, message: 'Web notification sent successfully.' };
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
async function sendBulkNotifications({ groups: groups = [], recipients: recipients = [], message: message, platform: platform, options: options = {} }) {
    if (!message || !platform) {
        throw new Error('Message and platform are required.');
    }

    let allRecipients = [];

    // Fetch recipients from specified groups
    if (groups && Array.isArray(groups) && groups.length > 0) {
        const groupRecipients = await PushSubscription.find({
            groups: { $in: groups },
        }).select('mobileNumber userId -_id'); // Fetch only mobileNumber and userId fields
        console.log(groupRecipients)
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
        throw new Error('No recipients found for the specified groups or recipients.');
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

    return { results, errors };
}

module.exports = { sendWebPushNotification, sendNativePushNotification, sendBulkNotifications };