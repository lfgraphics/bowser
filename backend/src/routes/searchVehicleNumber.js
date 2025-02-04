const express = require('express');
const router = express.Router();
const Vehicle = require('../models/vehicle');
const Driver = require('../models/driver');

router.get('/:vehicleNumber', async (req, res) => {
    const vehicleNumber = req.params.vehicleNumber;

    try {
        // Step 1: Fetch vehicles based on vehicle number and existing driver info
        const vehicles = await Vehicle.find({ VehicleNo: { $regex: vehicleNumber, $options: 'i' } }).limit(20);
        // , "tripDetails.driver": { $exists: true } 

        if (vehicles.length === 0) {
            return res.status(404).json({ message: 'No vehicle found with the given search term' });
        }
        // Step 2: Enrich each vehicle with driver's last used mobile number
        const enrichedVehicles = await Promise.all(
            vehicles.map(async (vehicle) => {
                const driverString = `${vehicle.tripDetails.driver}`; // Driver string
                let driverName = driverString; // Default name is the full string
                let lastUsedMobileNo = null;

                // Extract ITPL number from the driver string
                const itplMatch = driverString.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
                const itplNumber = itplMatch ? itplMatch[0].replace(/[()]/g, '').toUpperCase() : driverName;

                // Fetch driver details from the drivers collection using the extracted ITPL number
                const driver = await Driver.findOne({
                    Name: { $regex: itplNumber, $options: 'i' }
                });

                if (driver && driver.MobileNo && Array.isArray(driver.MobileNo)) {
                    // Find the mobile number marked as LastUsed: true
                    const lastUsedMobile = driver.MobileNo.find((mobile) => mobile.LastUsed === true);
                    if (lastUsedMobile) {
                        lastUsedMobileNo = lastUsedMobile.MobileNo;
                    }
                }

                // Reformat tripDetails.driver with updated structure
                const updatedTripDetails = {
                    ...vehicle.tripDetails,
                    driver: {
                        name: driverName, // Set full driver string as the name
                        mobile: lastUsedMobileNo // Set last used mobile number
                    }
                };

                // Return enriched vehicle data with updated tripDetails
                return {
                    ...vehicle.toObject(),
                    tripDetails: updatedTripDetails // Replace tripDetails with updated structure
                };
            })
        );

        // Step 3: Return the enriched vehicle data
        res.status(200).json(enrichedVehicles);
    } catch (err) {
        console.error('Error searching vehicles:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
