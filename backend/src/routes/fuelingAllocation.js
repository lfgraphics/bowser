const express = require('express');
const router = express.Router();
const FuelingOrder = require('../models/fuelingOrders');
const mongoose = require('mongoose');
const User = require('../models/user');
const { Expo } = require('expo-server-sdk');
let expo = new Expo();

router.post('/', async (req, res) => {
    try {
        const {
            vehicleNumber,
            driverId,
            driverName,
            driverMobile,
            quantityType,
            fuelQuantity,
            bowserDriver,
            allocationAdmin,
        } = req.body;

        const newFuelingOrder = new FuelingOrder({
            vehicleNumber,
            driverId,
            driverName,
            driverMobile,
            quantityType,
            fuelQuantity,
            bowserDriver: {
                _id: new mongoose.Types.ObjectId(bowserDriver._id),
                userName: bowserDriver.userName,
                userId: bowserDriver.userId
            },
            allocationAdmin: {
                _id: new mongoose.Types.ObjectId(allocationAdmin._id),
                userName: allocationAdmin.userName,
                userId: allocationAdmin.userId,
                location: allocationAdmin.location
            },
        });

        await newFuelingOrder.save();

        // Fetch the bowser driver's push token
        const bowserDriverUser = await User.findOne({ userId: bowserDriver.userId });
        if (!bowserDriverUser || !bowserDriverUser.pushToken) {
            throw new Error('Bowser driver not found or push token not registered');
        }

        const orderId = newFuelingOrder._id;
        await User.updateMany(
            { userId: { $in: [bowserDriver.userId, allocationAdmin.userId] } },
            { $push: { orders: orderId } },
            { new: true, upsert: true }
        );

        // Send notification to the bowser driver
        const notificationPayload = {
            to: bowserDriverUser.pushToken,
            sound: './assets/notification.mp3',
            title: 'New Fueling Order',
            body: `New order for you\nVehicle Number: ${vehicleNumber}\nDriver: ${driverName}\nAllocated by ${allocationAdmin.userName} (${allocationAdmin.userId})`,
            data: {
                orderId: newFuelingOrder._id.toString(),
                vehicleNumber: vehicleNumber,
                driverName: driverName,
                driverId: driverId,
                driverMobile: driverMobile,
                quantityType: quantityType,
                fuelQuantity: fuelQuantity,
                allocationAdminName: allocationAdmin.userName,
                allocationAdminId: allocationAdmin.userId,
                buttons: [
                    {
                        text: "Call Driver",
                        action: "call",
                        phoneNumber: driverMobile
                    },
                    {
                        text: "Fuel",
                        action: "openScreen",
                        screenName: "NotificationFueling",
                        params: {
                            orderId: newFuelingOrder._id.toString(),
                            vehicleNumber: vehicleNumber,
                            driverName: driverName,
                            driverId: driverId,
                            driverMobile: driverMobile,
                            quantityType: quantityType,
                            fuelQuantity: fuelQuantity,
                            allocationAdminName: allocationAdmin.userName,
                            allocationAdminId: allocationAdmin.userId
                        }
                    }
                ]
            }
        };

        if (Expo.isExpoPushToken(bowserDriverUser.pushToken)) {
            const chunks = expo.chunkPushNotifications([notificationPayload]);
            try {
                const ticketChunks = await Promise.all(chunks.map(chunk => expo.sendPushNotificationsAsync(chunk)));
            } catch (error) {
                throw new Error(`Failed to send push notification: ${error.message}`);
            }
        } else {
            throw new Error('Invalid push token');
        }

        res.status(201).json({ message: 'Fueling allocation created and notification sent successfully', order: newFuelingOrder });
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;
