const express = require('express');
const router = express.Router();
// const Bowser = require('../models/bowser');
const TripSheet = require('../models/tripsheet');
// const mongoose = require('mongoose');


// router.get('/:regNo', async (req, res) => {
//     const regNo = req.params.regNo;

//     try {
//         const bowsers = await Bowser.find({
//             regNo: { $regex: regNo, $options: 'i' }
//         });

//         if (bowsers.length === 0) {
//             return res.status(404).json({ message: 'No bowsers found with the given registration number' });
//         }

//         const bowserDetails = await Promise.all(bowsers.map(async (bowser) => {
//             const trip = await TripSheet.findById(bowser.currentTrip);

//             const driversWithHandover = trip.bowserDriver.filter(driver => driver.handOverDate);
//             let selectedDriver;

//             if (driversWithHandover.length > 0) {
//                 selectedDriver = driversWithHandover.sort((a, b) => new Date(b.handOverDate) - new Date(a.handOverDate))[0];
//             } else {
//                 selectedDriver = trip.bowserDriver[0];
//             }

//             return {
//                 regNo: bowser.regNo,
//                 _id: bowser._id,
//                 bowserDriver: selectedDriver ? selectedDriver : { message: 'Driver details not found for this bowser' }
//             };
//         }));

//         res.status(200).json({ bowserDetails });

//     } catch (err) {
//         console.error('Error searching bowsers, trip details, or bowser drivers:', err);
//         console.error('Error stack:', err.stack);
//         res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
//     }
// });

router.get('/trip/:tripSheetId', async (req, res) => {
    const tripSheetId = req.params.tripSheetId;

    try {
        const trip = await TripSheet.findOne({ tripSheetId: tripSheetId }).populate([
            { path: 'bowserDriver' },
            { path: 'bowser' },
        ]);

        if (!trip) {
            return res.status(404).json({ message: 'No trip found with the given tripSheetId' });
        }

        const bowserRegNo = trip.bowser.regNo;

        if (!bowserRegNo) {
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
        res.status(200).json({ bowserDetails });

    } catch (err) {
        console.error('Error searching for trip or bowser details:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

module.exports = router;
