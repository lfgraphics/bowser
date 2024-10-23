const express = require('express');
const router = express.Router();
const FuelingOrder = require('../models/fuelingOrders'); // Make sure this path is correct
const mongoose = require('mongoose');

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

        res.status(201).json({ message: 'Fueling allocation created successfully', order: newFuelingOrder });
    } catch (error) {
        console.error('Fueling allocation error:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message,
            stack: error.stack // This will provide the error stack trace
        });
    }
});

module.exports = router;
