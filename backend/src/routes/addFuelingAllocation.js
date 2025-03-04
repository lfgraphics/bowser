const express = require('express');
const router = express.Router();
const { mongoose } = require('mongoose');
const { sendNativePushNotification } = require('../utils/pushNotifications')
const fuelingOrders = require('../models/fuelingOrders');
const Vehicle = require('../models/vehicle')
const FuelRequest = require('../models/FuelRequest');

router.post('/', async (req, res) => {
    let newFuelingOrder;
    let notificationSent = false;
    console.log(req.body)

    try {
        const {
            allocationType,
            pumpAllocationType,
            fuelProvider,
            petrolPump,
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
            requestId
        } = req.body;

        newFuelingOrder = new fuelingOrders({
            allocationType,
            pumpAllocationType,
            fuelProvider,
            petrolPump,
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
            request: requestId ? new mongoose.Types.ObjectId(String(requestId)) : null
        });
        if (allocationType !== 'external') {
            try {
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
                // Check if the notification was successfully sent
                if (sentNotificationResponse.success) {
                    console.log('Notification sent successfully:', sentNotificationResponse.response);
                    notificationSent = true;
                } else {
                    console.warn('Notification was not sent:', sentNotificationResponse.response);
                }
            } catch (error) {
                console.error(error);
            }
        }
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

        if (requestId) {
            const fuelRequest = await FuelRequest.findByIdAndUpdate(
                new mongoose.Types.ObjectId(String(requestId)),
                {
                    $set: {
                        fulfilled: true,
                        allocation: newFuelingOrder._id
                    }
                },
                { new: true, upsert: true }
            );
            await fuelRequest.save();
            const notificationPayloadData = {
                buttons: [
                    {
                        text: "Call Driver",
                        action: "call",
                        phoneNumber: newFuelingOrder.bowser.driver.phoneNumber,
                    },
                ]
            };
            let fuelLer = allocationType !== 'external' ? `${newFuelingOrder.bowser.driver.name} आपके वाहन को ईंधन देने के लिए आ रहे हैं।\nड्राइवर से संपर्क करने के लिए ${newFuelingOrder.bowser.driver.phoneNo} पर कॉल करें।` : `${fuelProvider} ${petrolPump.length && petrolPump.length > 0 ? "के" + petrolPump : "के किसी भी" + "पेट्रोल पंप से तेल ले लें"}`
            await sendNativePushNotification({
                mobileNumber: fuelRequest.driverMobile,
                message: `आपका ईंधन अनुरोध ${newFuelingOrder.allocationAdmin.id} द्वारा पूरा कर दिया गया है।\n${fuelLer}`,
                options: { title: 'ईंधन अनुरोध पूरा हुआ', data: JSON.stringify({ notificationPayloadData }) }
            });
        }

    } catch (error) {
        console.error("Error in fueling allocation:", error);
        res.status(500).json({ message: error.message });
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
