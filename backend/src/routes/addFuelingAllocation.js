const express = require('express');
const router = express.Router();
// const FuelingTransaction = require('../models/fuelingTransaction');
// const mongoose = require('mongoose');
// const User = require('../models/user');
// const { Expo } = require('expo-server-sdk');
const fuelingOrders = require('../models/fuelingOrders');
// let expo = new Expo();

router.post('/', async (req, res) => {
    let newFuelingOrder, bowserDriverUser, notificationPayload, pushTokenMissing = false;
    let notificationSent = false;
    console.log(req.body)

    try {
        const {
            vehicleNumber,
            driverId,
            driverName,
            driverMobile,
            quantityType,
            fuelQuantity,
            bowser,
            allocationAdmin,
        } = req.body;


        newFuelingOrder = new fuelingOrders({
            vehicleNumber,
            driverId,
            driverName,
            driverMobile,
            quantityType,
            fuelQuantity,
            bowser: {
                regNo: bowser.regNo,
                driver: {
                    name: bowser.driver.name,
                    id: bowser.driver.id,
                    phoneNo: bowser.driver.phoneNo
                }
            },
            allocationAdmin: {
                name: allocationAdmin.name,
                id: allocationAdmin.id,
            },
        });

        // Fetch bowser driver's push token
        // try {
        //     bowserDriverUser = await User.findOne({ userId: bowser.driver.id });
        //     if (!bowserDriverUser || !bowserDriverUser.pushToken) {
        //         console.warn('Bowser driver not found or push token not registered');
        //         pushTokenMissing = true;
        //     }
        // } catch (error) {
        //     console.error("Error fetching bowser driver:", error);
        //     throw new Error("Failed to fetch bowser driver information");
        // }

        // Prepare notification payload
        // try {
        //     if (bowserDriverUser && bowserDriverUser.pushToken) {
        //         notificationPayload = {
        //             to: bowserDriverUser.pushToken,
        //             sound: 'default',
        //             title: 'New Fueling Order',
        //             body: `New order for you\nVehicle Number: ${vehicleNumber}\nDriver: ${driverName}\nAllocated by ${allocationAdmin.userName} (${allocationAdmin.userId})`,
        //             data: {
        //                 orderId: newFuelingOrder._id.toString(),
        //                 vehicleNumber: vehicleNumber,
        //                 driverName: driverName,
        //                 driverId: driverId,
        //                 driverMobile: driverMobile,
        //                 quantityType: quantityType,
        //                 fuelQuantity: fuelQuantity,
        //                 allocationAdminName: allocationAdmin.userName,
        //                 allocationAdminId: allocationAdmin.userId,
        //                 buttons: [
        //                     {
        //                         text: "Call Driver",
        //                         action: "call",
        //                         phoneNumber: driverMobile
        //                     },
        //                     {
        //                         text: "Fuel",
        //                         action: "openScreen",
        //                         screenName: "NotificationFueling",
        //                         params: {
        //                             orderId: newFuelingOrder._id.toString(),
        //                             vehicleNumber: vehicleNumber,
        //                             driverName: driverName,
        //                             driverId: driverId,
        //                             driverMobile: driverMobile,
        //                             quantityType: quantityType,
        //                             fuelQuantity: fuelQuantity,
        //                             allocationAdminName: allocationAdmin.userName,
        //                             allocationAdminId: allocationAdmin.userId
        //                         }
        //                     }
        //                 ]
        //             }
        //         };
        //     }
        // } catch (error) {
        //     console.error("Error preparing notification payload:", error);
        //     // No need to throw an error here, just skip sending notification
        // }

        // Send push notification
        // try {
        //     if (bowserDriverUser && Expo.isExpoPushToken(bowserDriverUser.pushToken)) {
        //         const chunks = expo.chunkPushNotifications([notificationPayload]);
        //         await Promise.all(chunks.map(chunk => expo.sendPushNotificationsAsync(chunk)));
        //         notificationSent = true; // Mark notification as sent
        //     } else {
        //         console.error('Invalid push token or token missing');
        //     }
        // } catch (error) {
        //     console.error("Error sending push notification:", error);
        //     // Log the error but still return success for order allocation
        // }

        // Create and save new FuelingOrder
        try {
            console.log("New Fueling Order:", newFuelingOrder);
            await newFuelingOrder.save();
        } catch (error) {
            console.error("Error creating FuelingOrder:", error);
            throw new Error("Fueling Allocation Failed", error);
        }

        // Update User documents
        // try {
        //     await User.updateMany(
        //         { userId: { $in: [bowserDriver.userId, allocationAdmin.userId] } },
        //         { $push: { orders: newFuelingOrder._id } },
        //         { new: true, upsert: true }
        //     );
        // } catch (error) {
        //     console.error("Error updating User documents:", error);
        //     throw new Error("Failed to update Users profile", error);
        // }

        // Prepare response message
        const responseMessage = notificationSent
            ? 'Fueling allocation successful. Notification sent to bowser driver.'
            : 'Fueling allocation successful. No notification sent due to missing or invalid push token.';

        res.status(201).json({ message: responseMessage, order: newFuelingOrder });
        console.log({ message: responseMessage, order: newFuelingOrder });

    } catch (error) {
        console.error("Error in fueling allocation:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({
            message: error.message,
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;