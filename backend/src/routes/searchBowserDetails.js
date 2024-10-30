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

        console.log(bowsers)

        if (bowsers.length === 0) {
            console.log(`No bowsers found with the given registration number: ${regNo}`);
            return res.status(404).json({ message: 'No bowsers found with the given registration number' });
        }

        console.log(`Found ${bowsers.length} bowsers with the given registration number: ${regNo}`);
        // Then, for each bowser, find the corresponding trip details and populate the 'bowserDriver' field.
        const bowserDetails = await Promise.all(bowsers.map(async (bowser) => {
            console.log(`Fetching trip details for bowser: ${bowser.regNo}`);
            const trip = await TripSheet.findById(bowser.currentTrip);
            const driver = trip ? await User.findById(trip.bowserDriver).select('userId name') : null;
            return {
                regNo: bowser.regNo,
                _id: bowser._id,
                bowserDriver: driver ? driver : { message: 'Driver details not found for this bowser' }
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

module.exports = router;
