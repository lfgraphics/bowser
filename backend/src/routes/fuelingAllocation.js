const express = require('express');
const router = express.Router();
const FuelingOrder = require('../models/fuelingOrders');
const mongoose = require('mongoose');
const User = require('../models/user');
const { Expo } = require('expo-server-sdk');
let expo = new Expo();

router.post('/', async (req, res) => {
    let newFuelingOrder, bowserDriverUser, notificationPayload, pushTokenMissing = false;

    try {
        const {
            vehicleNumber,
            driverId,
            driverName,
            driverMobile,
            quantityType,
            fuelQuantity,
            bowser,
            bowserDriver,
            allocationAdmin,
        } = req.body;


        newFuelingOrder = new FuelingOrder({
            vehicleNumber,
            driverId,
            driverName,
            driverMobile,
            quantityType,
            fuelQuantity,
            bowser: {
                _id: bowser._id,
                regNo: bowser.regNo,
                ref: 'Bowser'
            },
            bowserDriver: {
                _id: bowserDriver._id,
                userName: bowserDriver.userName,
                userId: bowserDriver.userId
            },
            allocationAdmin: {
                _id: allocationAdmin._id,
                userName: allocationAdmin.userName,
                userId: allocationAdmin.userId,
                location: allocationAdmin.location
            },
        });

        // Fetch bowser driver's push token
        try {
            bowserDriverUser = await User.findOne({ userId: bowserDriver.userId });
            if (!bowserDriverUser || !bowserDriverUser.pushToken) {
                console.warn('Bowser driver not found or push token not registered');
                pushTokenMissing = true;
            }
        } catch (error) {
            console.error("Error fetching bowser driver:", error);
            throw new Error("Failed to fetch bowser driver information");
        }

        // Prepare notification payload
        try {
            if (!bowserDriverUser.pushToken) {
                console.warn('Bowser driver push token is missing');
                pushTokenMissing = true;
            }
            notificationPayload = {
                to: bowserDriverUser.pushToken,
                sound: 'default',
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
        } catch (error) {
            console.error("Error preparing notification payload:", error);
            throw new Error("Failed to prepare notification payload");
        }

        // Send push notification
        try {
            if (Expo.isExpoPushToken(bowserDriverUser.pushToken)) {
                const chunks = expo.chunkPushNotifications([notificationPayload]);
                await Promise.all(chunks.map(chunk => expo.sendPushNotificationsAsync(chunk)));
            } else {
                console.error('Invalid push token');
                // Instead of throwing an error, log and continue
                return res.status(201).json({
                    message: 'Fueling allocation successful. Notification could not be sent due to invalid push token.',
                    order: newFuelingOrder
                });
            }
        } catch (error) {
            console.error("Error sending push notification:", error);
            // Log the error but still return success for order allocation
            return res.status(201).json({
                message: 'Fueling allocation successful. Notification failed to send.',
                order: newFuelingOrder
            });
        }

        // Update User documents
        try {
            await User.updateMany(
                { userId: { $in: [bowserDriver.userId, allocationAdmin.userId] } },
                { $push: { orders: newFuelingOrder._id } },
                { new: true, upsert: true }
            );
        } catch (error) {
            console.error("Error updating User documents:", error);
            throw new Error("Failed to update User documents");
        }
        res.status(201).json({ message: 'Fueling allocation successful. Notification sent to bowser driver.', order: newFuelingOrder });

        // Create and save new FuelingOrder
        try {
            await newFuelingOrder.save();
        } catch (error) {
            console.error("Error creating FuelingOrder:", error);
            throw new Error("Failed to create FuelingOrder");
        }
    } catch (error) {
        console.error("Error in fueling allocation:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;
