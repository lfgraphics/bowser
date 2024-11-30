const express = require('express');
const router = express.Router();
const TripSheet = require('../models/tripsheet');
const mongoose = require('mongoose');
const User = require('../models/user');
const Bowser = require('../models/bowser');

router.post('/create', async (req, res) => {
    let tripSheetId = req.body.tripSheetId;

    if (!tripSheetId) {
        console.error("Invalid tripSheetId:", tripSheetId);
        return res.status(400).json({ message: 'Invalid tripSheetId' });
    }

    try {
        // Extract the bowser registration number from the request
        const newSheetBowser = req.body.bowser.regNo;

        if (!newSheetBowser) {
            return res.status(400).json({ message: 'Bowser registration number is required.' });
        }

        // Find the Bowser document using the registration number
        const bowser = await Bowser.findOne({ regNo: newSheetBowser });

        if (bowser && bowser.currentTrip) {
            // If currentTrip exists, check if the trip is settled
            const currentTrip = await TripSheet.findById(bowser.currentTrip);

            if (currentTrip && !currentTrip.settelment.settled) {
                // If the current trip is not settled, return an error
                return res.status(405).json({
                    title: "Error",
                    message: `This bowser is currently on an unsettled trip. First settle the existing unsettled trip: (${currentTrip.tripSheetId}) then create a new one.`
                });
            }
        }

        // Create a new TripSheet instance
        const newSheet = new TripSheet(req.body);

        // Define save options
        const saveOptions = {
            writeConcern: {
                w: 'majority',
                wtimeout: 30000
            }
        };

        // Save the new TripSheet with a timeout promise
        const savePromise = newSheet.save(saveOptions);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Save operation timed out')), 35000)
        );

        // Await the result of either save or timeout
        await Promise.race([savePromise, timeoutPromise]);

        // Update the bowser driver information
        const bowserDriverId = req.body.bowserDriver[0]?.id;
        if (bowserDriverId) {
            await User.findOneAndUpdate(
                { userId: bowserDriverId },
                { $set: { bowserId: newSheetBowser } },
                { new: true, upsert: true }
            );
        }

        // Update the Bowser with the new trip information
        const updatedBowser = await Bowser.findOneAndUpdate(
            { regNo: newSheetBowser },
            { $set: { currentTrip: newSheet._id } },
            { new: true }
        );

        if (!updatedBowser) {
            console.warn(`No bowser found with regNo: ${newSheetBowser}`);
        }

        res.status(200).json({ message: 'Trip Sheet created successfully' });
    } catch (err) {
        console.error('Error creating Trip Sheet:', err);

        if (err.message === 'Save operation timed out') {
            res.status(503).json({
                message: 'The database operation timed out. Please try again later.',
                error: 'Database timeout'
            });
        } else if (err.name === 'MongooseError' && err.message.includes('buffering timed out')) {
            res.status(503).json({
                message: 'The database is currently unavailable. Please try again later.',
                error: 'Database connection timeout'
            });
        } else {
            res.status(500).json({
                message: 'An error occurred while Trip Sheet Creation. Please try again',
                error: err.message
            });
        }
    }
});

router.get('/all', async (req, res) => {
    const { driverName, bowserRegNo, tripSheetId, unsettled, sortField, sortOrder } = req.query;
    const query = {};

    if (driverName) query['bowserDriver.name'] = { $regex: driverName, $options: 'i' };
    if (bowserRegNo) query['bowser.regNo'] = { $regex: bowserRegNo, $options: 'i' };
    if (tripSheetId) query['tripSheetId'] = { $regex: tripSheetId, $options: 'i' };
    if (unsettled === 'true') query['settelment.settled'] = false;

    try {
        let sortOptions = {};
        if (sortField) {
            sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;
        }

        const sheets = await TripSheet.find(query).sort(sortOptions);
        res.status(200).json(sheets);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch sheets', error: err.message });
    }
});


router.get('/find-by-sheetId/:tripSheetId', async (req, res) => {
    const tripSheetId = req.params.tripSheetId;

    try {
        const sheets = await TripSheet.find({
            tripSheetId: { $regex: tripSheetId, $options: 'i' }
        });

        if (sheets.length === 0) {
            return res.status(404).json({ message: 'No Sheet found with the given tripSheetId number' });
        }
        res.status(200).json({ sheets });

    } catch (err) {
        console.error('Error searching bowsers, trip details, or bowser drivers:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});
router.get('/find-by-id/:id', async (req, res) => {
    const id = req.params.id;

    try {
        // First, find all bowsers with the given registration number.
        const sheet = await TripSheet.findById(new mongoose.Types.ObjectId(id));


        res.status(200).json({ sheet });

    } catch (err) {
        console.error('Error searching bowsers, trip details, or bowser drivers:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});
router.patch('/update/:id', async (req, res) => {
    const id = req.params.id;
    const updateData = req.body;

    try {
        const updatedSheet = await TripSheet.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

        if (!updatedSheet) {
            return res.status(404).json({ message: 'Trip Sheet not found' });
        }

        res.status(200).json({ message: 'Trip Sheet updated successfully', success: true });
    } catch (err) {
        console.error('Error updating Trip Sheet:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});
router.delete('/delete/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const deletedSheet = await TripSheet.findByIdAndDelete(id);

        if (!deletedSheet) {
            return res.status(404).json({ message: 'Trip Sheet not found' });
        }

        res.status(200).json({ message: 'Trip Sheet deleted successfully', success: true });
    } catch (err) {
        console.error('Error deleting Trip Sheet:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.get('/find-sheet-id-by-userId/:id', async (req, res) => {
    let id = req.params.id
    try {
        // const tripsheet = await TripSheet.findOne({'bowserDriver.id'=id})
        // // Extract query parameters
        // const { name, id, phoneNo } = req.query;
        // // Build the search criteria
        const searchCriteria = {};
        // if (name) searchCriteria['bowserDriver.name'] = name;
        if (id) searchCriteria['bowserDriver.id'] = id;
        // if (phoneNo) searchCriteria['bowserDriver.phoneNo'] = phoneNo;

        // // Search for the trip sheet
        const tripSheet = await TripSheet.findOne(searchCriteria).select('tripSheetId');

        if (!tripSheet) {
            return res.status(404).json({ message: 'Trip sheet not found' });
        }

        res.status(200).json(tripSheet.tripSheetId);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
