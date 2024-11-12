const express = require('express');
const router = express.Router();
const TripSheet = require('../models/tripsheet');
const mongoose = require('mongoose');
const User = require('../models/user');
const Bowser = require('../models/bowser');

router.post('/create', async (req, res) => {
    let tripSheetId = req.body.tripSheetId
    if (!tripSheetId || typeof tripSheetId !== 'string') {
        console.error("Invalid tripSheetId:", tripSheetId);
        res.status(400).json({ message: 'Invalid tripSheetId' });
        throw new Error("tripSheetId cannot be null or undefined");
    }
    try {
        const newSheet = new TripSheet(req.body);
        const saveOptions = {
            writeConcern: {
                w: 'majority',
                wtimeout: 30000
            }
        };

        const savePromise = newSheet.save(saveOptions);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Save operation timed out')), 35000)
        );

        await Promise.race([savePromise, timeoutPromise]);

        // const bowserDriverId = req.body.bowserDriver[0].id;
        // const bowserRegNo = req.body.bowser.regNo;
        // const updatedUser = await User.findOneAndUpdate(
        //     { userId: bowserDriverId },
        //     { $set: { bowserId: bowserRegNo } },
        //     { new: true, upsert: true }
        // );

        // const updatedBowser = await Bowser.findOneAndUpdate(
        //     { regNo: bowserRegNo },
        //     { $set: { currentTrip:  newSheet._id } },
        //     { new: true }
        // );

        // if (!updatedBowser) {
        //     console.warn(`No bowser found with regNo: ${bowserRegNo}`);
        // } else {
        // }

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
})

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
        console.log(`Searching for Trip Sheet with id: ${id}`);
        // First, find all bowsers with the given registration number.
        const sheet = await TripSheet.findById(new mongoose.Types.ObjectId(id));

        console.log(sheet)

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
        console.log(`Attempting to update Trip Sheet with id: ${id}`);
        const updatedSheet = await TripSheet.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

        if (!updatedSheet) {
            return res.status(404).json({ message: 'Trip Sheet not found' });
        }

        console.log(`Successfully updated Trip Sheet with id: ${id}`);
        res.status(200).json({ message: 'Trip Sheet updated successfully', success: true });
    } catch (err) {
        console.error('Error updating Trip Sheet:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});
router.delete('/delete/:id', async (req, res) => {
    const id = req.params.id;

    try {
        console.log(`Attempting to delete Trip Sheet with id: ${id}`);
        const deletedSheet = await TripSheet.findByIdAndDelete(id);

        if (!deletedSheet) {
            return res.status(404).json({ message: 'Trip Sheet not found' });
        }

        console.log(`Successfully deleted Trip Sheet with id: ${id}`);
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
