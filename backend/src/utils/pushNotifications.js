const webpush = require('web-push');
const PushSubscription = require('../models/pushSubscription');

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
async function sendPushNotification(mobileNumber, message, options = {}) {
    try {
        // Fetch the user's subscription from the database
        const subscriptionData = await PushSubscription.findOne({ mobileNumber });

        if (!subscriptionData || !subscriptionData.subscription) {
            throw new Error('No subscription found for this mobile number.');
        }

        const subscription = subscriptionData.subscription;

        // Default notification payload
        const notificationPayload = JSON.stringify({
            title: options.title || 'New Fuel Requirment',
            body: message,
            icon: options.icon || '/icon-512x512.png',
        });

        // Send the push notification
        await webpush.sendNotification(subscription, notificationPayload);

        return { success: true, message: 'Notification sent successfully.' };
    } catch (error) {
        console.error('Error sending push notification:', error);
        return { success: false, error: error.message || 'Failed to send notification.' };
    }
}

module.exports = { sendPushNotification };
