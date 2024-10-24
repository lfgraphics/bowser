const express = require('express');
const router = express.Router();
const Vehicle = require('../models/vehicle');

router.get('/:vehicleNumber', async (req, res) => {
    const vehicleNumber = req.params.vehicleNumber;

    try {
        console.log('Attempting to search for vehicles with term:', vehicleNumber);
        const vehicles = await Vehicle.find({ VehicleNo: { $regex: vehicleNumber, $options: 'i' } }).exec();

        console.log('Search completed. Found', vehicles.length, 'vehicles');

        if (vehicles.length === 0) {
            return res.status(404).json({ message: 'No vehicle found with the given search term' });
        }

        res.status(200).json(vehicles);
    } catch (err) {
        console.error('Error searching vehicles:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

module.exports = router;
