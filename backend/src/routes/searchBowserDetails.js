const express = require('express');
const router = express.Router();
const Bowser = require('../models/bowser');
const TripSheet = require('../models/tripsheet');
const User = require('../models/user');
const mongoose = require('mongoose');


router.get('/:regNo', async (req, res) => {
    const regNo = req.params.regNo;

    try {
        console.log(`Searching for bowsers with registration number: ${regNo}`);
        // First, find all bowsers with the given registration number.
        const bowsers = await Bowser.find({
            regNo: { $regex: regNo, $options: 'i' }
        });

        if (bowsers.length === 0) {
            console.log(`No bowsers found with the given registration number: ${regNo}`);
            return res.status(404).json({ message: 'No bowsers found with the given registration number' });
        }

        const bowserDetails = await Promise.all(bowsers.map(async (bowser) => {
            console.log(`Fetching trip details for bowser: ${bowser.regNo}`);
            const trip = await TripSheet.findById(bowser.currentTrip);

            // New logic to find the appropriate driver based on handover time
            const driversWithHandover = trip.bowserDriver.filter(driver => driver.handOverDate);
            let selectedDriver;

            if (driversWithHandover.length > 0) {
                // Sort by handOverDate to get the most recent one
                selectedDriver = driversWithHandover.sort((a, b) => new Date(b.handOverDate) - new Date(a.handOverDate))[0];
            } else {
                // If no drivers have handOverDate, select the first one (if any)
                selectedDriver = trip.bowserDriver[0];
            }

            return {
                regNo: bowser.regNo,
                _id: bowser._id,
                bowserDriver: selectedDriver ? selectedDriver : { message: 'Driver details not found for this bowser' }
            };
        }));

        console.log(`Fetched bowser details with driver information.`, bowserDetails);

        res.status(200).json({ bowserDetails });

    } catch (err) {
        console.error('Error searching bowsers, trip details, or bowser drivers:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

// New route to find bowser details by tripSheetId
router.get('/trip/:tripSheetId', async (req, res) => {
    const tripSheetId = req.params.tripSheetId;

    try {
        console.log(`Searching for bowser details with tripSheetId: ${tripSheetId}`);
        const trip = await TripSheet.findOne({ tripSheetId: tripSheetId }).populate([
            { path: 'bowserDriver' },
            { path: 'bowser' },
        ]);

        if (!trip) {
            console.log(`No trip found with the given tripSheetId: ${tripSheetId}`);
            return res.status(404).json({ message: 'No trip found with the given tripSheetId' });
        }

        const bowserRegNo = trip.bowser.regNo;

        if (!bowserRegNo) {
            console.log(`No bowser regNo found for the trip with ID: ${tripSheetId}`);
            return res.status(404).json({ message: 'No bowser regNo found for the trip' });
        }

        // New logic to find the appropriate driver based on handover time
        const driversWithHandover = trip.bowserDriver.filter(driver => driver.handOverDate);
        let selectedDriver;

        if (driversWithHandover.length > 0) {
            // Sort by handOverDate to get the most recent one
            selectedDriver = driversWithHandover.sort((a, b) => new Date(b.handOverDate) - new Date(a.handOverDate))[0];
        } else {
            // If no drivers have handOverDate, select the first one (if any)
            selectedDriver = trip.bowserDriver[0];
        }

        // Prepare the response with bowser regNo and driver details in the required format
        const bowserDetails = [
            {
                regNo: bowserRegNo,
                _id: trip._id,
                bowserDriver: selectedDriver ? {
                    handOverDate: selectedDriver.handOverDate,
                    name: selectedDriver.name,
                    id: selectedDriver.id,
                    phoneNo: selectedDriver.phoneNo
                } : { message: 'Driver details not found for this bowser' }
            }
        ];

        console.log(`Fetched bowser details for tripSheetId: ${tripSheetId}`, bowserDetails);
        res.status(200).json({ bowserDetails });

    } catch (err) {
        console.error('Error searching for trip or bowser details:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

module.exports = router;
