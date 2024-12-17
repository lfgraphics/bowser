const express = require('express');
const router = express.Router();
// const axios = require("axios")
const { sendNativePushNotification } = require('../utils/pushNotifications')
const fuelingOrders = require('../models/fuelingOrders');
const Vehicle = require('../models/vehicle')

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
                party: party,
                category: category,
                vehicleNumber: vehicleNumber,
                driverName: driverName,
                driverId: driverId,
                driverMobile: driverMobile,
                quantityType: quantityType,
                quantity: fuelQuantity,
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
                            party: party,
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

            let primaryHead = category == "Bulk Sale" ? `Party: ${party}` : `Vehicle Number: ${vehicleNumber}`;
            let secondaryHead = category == "Bulk Sale" ? `` : `Driver: ${driverName}\n`;
            let midHead = category == "Attatch" ? `Vendor: ${party}\n` : ``;
            // Send the notification request
            const sentNotificationResponse = await sendNativePushNotification(
                {
                    mobileNumber: newFuelingOrder.bowser.driver.phoneNo,
                    message: `${primaryHead}\n${midHead}${secondaryHead}Allocated by ${allocationAdmin.name} (${allocationAdmin.id})`,
                    options: { title: 'New Fueling Order', data: JSON.stringify(pushData) }
                }
            )
            // const sentNotificationResponse = await axios.post(
            //     `https://app.nativenotify.com/api/indie/notification`,
            //     {
            //         subID: newFuelingOrder.bowser.driver.phoneNo,
            //         appId: 25239,
            //         appToken: 'FWwj7ZcRXQi7FsC4ZHQlsi',
            //         title: 'New Fueling Order',
            //         message: `Vehicle Number: ${vehicleNumber}\nDriver: ${driverName}\nAllocated by ${allocationAdmin.name} (${allocationAdmin.id})`,
            //         pushData: JSON.stringify(pushData), // Properly stringify the pushData object
            //     }
            // );

            // Check if the notification was successfully sent
            if (sentNotificationResponse.success) {
                console.log('Notification sent successfully:', sentNotificationResponse.response);
                notificationSent = true;
            } else {
                console.warn('Notification was not successfully created:', sentNotificationResponse.response);
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

router.post('/updateTripDriver', async (req, res) => {
    const { vehicleNo, driver } = req.body;

    try {
        // Step 1: Find the vehicle by VehicleNo
        const vehicle = await Vehicle.findOne({ VehicleNo: vehicleNo });

        // Step 2: If vehicle is not found, return 404
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // Step 3: Update the tripDetails.driver field
        vehicle.tripDetails = vehicle.tripDetails || {}; // Ensure tripDetails exists
        vehicle.tripDetails.driver = driver;

        // Step 4: Save the updated document to the database
        const updatedVehicle = await vehicle.save();

        // Step 5: Send a success response
        res.status(200).json({
            message: "Driver details updated successfully",
            updatedVehicle
        });

    } catch (err) {
        // Step 6: Handle errors gracefully
        console.error("Error updating driver details:", err);
        res.status(500).json({
            message: "Server error while updating driver details",
            error: err.message
        });
    }
});

module.exports = router;
