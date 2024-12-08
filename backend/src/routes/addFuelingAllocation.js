const express = require('express');
const router = express.Router();
const axios = require("axios")
const fuelingOrders = require('../models/fuelingOrders');

router.post('/', async (req, res) => {
    let newFuelingOrder;
    let notificationSent = false;
    console.log(req.body)

    try {
        const {
            category,
            party,
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
            category,
            party,
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
                    phoneNo: bowser.driver.phoneNo
                }
            },
            allocationAdmin: {
                name: allocationAdmin.name,
                id: allocationAdmin.id,
            },
        });
        try {
            // Construct the pushData object properly
            const pushData = {
                vehicleNumber: vehicleNumber,
                driverName: driverName,
                driverId: driverId,
                driverMobile: driverMobile,
                quantityType: quantityType,
                fuelQuantity: fuelQuantity,
                allocationAdminName: allocationAdmin.name,
                allocationAdminId: allocationAdmin.id,
                buttons: [
                    {
                        text: "Call Driver",
                        action: "call",
                        phoneNumber: driverMobile,
                    },
                    {
                        text: "Fuel",
                        action: "openScreen",
                        screenName: "NotificationFueling",
                        params: {
                            category: category,
                            vehicleNumber: vehicleNumber,
                            driverName: driverName,
                            driverId: driverId,
                            driverMobile: driverMobile,
                            quantityType: quantityType,
                            fuelQuantity: fuelQuantity,
                            allocationAdminName: allocationAdmin.name,
                            allocationAdminId: allocationAdmin.id,
                        },
                    },
                ],
            };

            // Send the notification request
            const sentNotificationResponse = await axios.post(
                `https://app.nativenotify.com/api/indie/notification`,
                {
                    subID: newFuelingOrder.bowser.driver.phoneNo,
                    appId: 25239,
                    appToken: 'FWwj7ZcRXQi7FsC4ZHQlsi',
                    title: 'New Fueling Order',
                    message: `Vehicle Number: ${vehicleNumber}\nDriver: ${driverName}\nAllocated by ${allocationAdmin.name} (${allocationAdmin.id})`,
                    pushData: JSON.stringify(pushData), // Properly stringify the pushData object
                }
            );

            // Log the response for debugging
            console.log('Response Status:', sentNotificationResponse.status);
            console.log('Response Status Text:', sentNotificationResponse.statusText);

            // Check if the notification was successfully sent
            if (sentNotificationResponse.status === 201) {
                console.log('Notification sent successfully:', sentNotificationResponse.data);
                notificationSent = true;
            } else {
                console.warn('Notification was not successfully created:', sentNotificationResponse.data);
            }
        } catch (error) {
            // Enhanced error handling
            if (error.response) {
                console.error('Error Response Data:', error.response.data);
                console.error('Error Status:', error.response.status);
                console.error('Error Headers:', error.response.headers);
            } else if (error.request) {
                console.error('No Response Received:', error.request);
            } else {
                console.error('Error Message:', error.message);
            }
        }
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
