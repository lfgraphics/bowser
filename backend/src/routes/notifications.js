const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');
const User = require('../models/user');

let expo = new Expo();

router.post('/send', async (req, res) => {
    try {
        const { token, title, body, data } = req.body;

        if (!Expo.isExpoPushToken(token)) {
            console.error(`Push token ${token} is not a valid Expo push token`);
            return res.status(400).json({ error: 'Invalid push token' });
        }

        const message = {
            to: token,
            sound: 'default',
            title,
            body,
            data,
        };

        const chunks = expo.chunkPushNotifications([message]);
        const tickets = [];

        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error(error);
            }
        }

        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

router.post('/register-token', async (req, res) => {
    console.log('Received request to register token:', req.body);
    try {
        const { userId, pushToken } = req.body;
        if (!userId) {
            console.error('UserId is missing in the request');
            return res.status(400).json({ error: 'UserId is required' });
        }
        console.log('Searching for user with userId:', userId);
        const user = await User.findOneAndUpdate(
            { userId: userId },
            { $set: { pushToken: pushToken } },
            { new: true }
        );
        console.log('User found:', user);
        if (!user) {
            console.log('User not found for userId:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        console.log('Push token registered successfully for user:', userId);
        res.json({ success: true, message: 'Push token registered successfully' });
    } catch (error) {
        console.error('Error registering push token:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Failed to register push token', details: error.message });
    }
});

module.exports = router;
