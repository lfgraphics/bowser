const express = require('express');
const router = express.Router();
// const Vehicle = require('../models/vehicle');
const Vehicle = require('../models/vehicle');
// const Driver = require('../models/driver');

router.get('/:vehicleNumber', async (req, res) => {
    const vehicleNumber = req.params.vehicleNumber;

    try {
        const vehicles = await Vehicle.find({
            VehicleNo: { $regex: vehicleNumber, $options: 'i' },
            'tripDetails.open': true
        }).exec();

        if (vehicles.length === 0) {
            return res.status(404).json({ message: 'No vehicle found with the given search term' });
        }

        // const vehiclesWithDrivers = await Promise.all(vehicles.map(async (vehicle) => {
        //     const driver = await Driver.findOne({ Name: { $regex: vehicle.StartDriver, $options: 'i' } }).exec();
        //     return {
        //         vehicleNo: vehicle.VehicleNo,
        //         driverDetails: driver ? driver : { Name: "Driver details not found" }
        //     };
        // }));

        res.status(200).json(vehicles);
    } catch (err) {
        console.error('Error searching vehicles:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

module.exports = router;
