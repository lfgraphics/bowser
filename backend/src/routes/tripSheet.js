const express = require('express');
const router = express.Router();
const TripSheet = require('../models/TripSheets');
const mongoose = require('mongoose');
const User = require('../models/user');
const Bowser = require('../models/bowser');
const LoadingSheet = require('../models/LoadingSheet')

const checkExistingTrip = async (regNo) => {
    const bowser = await Bowser.findOne({ regNo });
    if (bowser && bowser.currentTrip) {
        const currentTrip = await TripSheet.findById(bowser.currentTrip);
        if (currentTrip && !currentTrip.settelment?.settled) {
            throw new Error(
                `This bowser is currently on an unsettled trip. Settle the existing trip (${currentTrip.tripSheetId}) before creating a new one.`
            );
        }
    }
};

const updateBowserDriver = async (phoneNo, regNo) => {
    if (!phoneNo) return;
    await User.findOneAndUpdate(
        { phoneNumber: phoneNo },
        { $set: { bowserId: regNo } },
        { new: true, upsert: true }
    );
};

const updateBowserCurrentTrip = async (regNo, tripSheetId) => {
    const updatedBowser = await Bowser.findOneAndUpdate(
        { regNo },
        { $set: { currentTrip: tripSheetId } },
        { new: true }
    );
    if (!updatedBowser) {
        console.warn(`No bowser found with regNo: ${regNo}`);
    }
};

router.post('/create', async (req, res) => {
    try {
        const { bowser, loading, fuelingAreaDestination, proposedDepartureTime } = req.body;

        // Check for existing unsettled trips
        await checkExistingTrip(bowser.regNo);

        // Create a new TripSheet instance
        const newSheet = new TripSheet({
            bowser,
            loading: {
                sheetId: new mongoose.Types.ObjectId(loading.sheetId),
                quantityByDip: loading.quantityByDip,
                quantityBySlip: loading.quantityBySlip
            },
            fuelingAreaDestination,
            proposedDepartureTime,
        });

        // Save the new TripSheet
        await newSheet.save();

        // Update bowser driver information
        const phoneNo = bowser.driver?.[0]?.phoneNo;
        await updateBowserDriver(phoneNo, bowser.regNo);

        // Update Bowser with the current trip
        await updateBowserCurrentTrip(bowser.regNo, newSheet._id);

        try {
            const updatedSheet = await LoadingSheet.findOneAndUpdate(
                { _id: loading.sheetId },
                { $set: { fulfilled: true } }, // Set the fulfilled field to true
                { new: true }
            );

            if (!updatedSheet) {
                console.error('Loading order not found');
                return;
            }

            console.log('Updated Loading Order:', updatedSheet);

        } catch (err) {
            console.error("Error updating LoadingSheet:", err);
        }

        // Send success response
        res.status(201).json({ message: 'Trip Sheet created successfully', tripSheet: newSheet });
    } catch (err) {
        console.error('Error creating Trip Sheet:', err.message);

        // Centralized error handling
        if (err.message.includes('unsettled trip')) {
            return res.status(405).json({ message: err.message });
        }

        res.status(500).json({ message: 'An error occurred during Trip Sheet creation', error: err.message });
    }
});

router.get('/all', async (req, res) => {
    const {
        regNo,
        unsettled,
        page = 1,
        limit = 20,
        sortField = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (regNo) filter['bowser.regNo'] = { $regex: regNo, $options: 'i' };
    if (unsettled === 'true') filter['settelment.settled'] = false;

    try {
        const tripSheets = await TripSheet.find(filter)
            .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json(tripSheets);
    } catch (err) {
        console.error('Error fetching TripSheets:', err);
        res.status(500).json({ message: 'Failed to fetch TripSheets', error: err.message });
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


        res.status(200).json(sheet);

    } catch (err) {
        console.error('Error searching bowsers, trip details, or bowser drivers:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});
router.patch('/update/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
        return res.status(400).json({ message: 'TripSheet ID is required.' });
    }

    try {
        const updatedTripSheet = await TripSheet.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedTripSheet) {
            return res.status(404).json({ message: 'TripSheet not found.' });
        }

        res.status(200).json({ message: 'TripSheet updated successfully', updatedTripSheet });
    } catch (err) {
        console.error('Error updating TripSheet:', err);
        res.status(500).json({ message: 'Failed to update TripSheet', error: err.message });
    }
});

router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'TripSheet ID is required.' });
    }

    try {
        const deletedTripSheet = await TripSheet.findByIdAndDelete(id);

        if (!deletedTripSheet) {
            return res.status(404).json({ message: 'TripSheet not found.' });
        }

        res.status(200).json({ message: 'TripSheet deleted successfully', deletedTripSheet });
    } catch (err) {
        console.error('Error deleting TripSheet:', err);
        res.status(500).json({ message: 'Failed to delete TripSheet', error: err.message });
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
