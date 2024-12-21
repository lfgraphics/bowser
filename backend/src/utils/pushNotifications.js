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
 * Send a push notification to a browser user.
 * @param {string} mobileNumber - The mobile number of the user.
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
 * @param {string} mobileNumber
 * @param {string} message
 * @param {object} [options]
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

module.exports = { sendWebPushNotification, sendNativePushNotification };