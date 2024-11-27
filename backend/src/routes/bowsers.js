const express = require('express');
const router = express.Router();
const Bowser = require('../models/bowser');
const mongoose = require('mongoose')

// Create a bowser
router.post('/create', async (req, res) => {
    try {
        const newBowser = new Bowser(req.body)
        const saveOptions = {
            writeConcern: {
                w: 'majority',
                wtimeout: 30000
            }
        };
        const savePromise = await newBowser.save(saveOptions)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Save operation timed out')), 35000)
        );

        await Promise.race([savePromise, timeoutPromise]);

        res.status(200).json({ message: 'Data Submitted successfully' });
    } catch (err) {
        console.error('Error saving fueling record data:', err);

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
                message: 'An error occurred while saving the fuleing transaction data. Please try again',
                error: err.message
            });
        }
    }
})

// Get all users with roles populated
router.get('/', async (req, res) => {
    try {
        const bowsers = await Bowser.find().populate('currentTrip').exec();
        res.status(200).json(bowsers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', details: error });
    }
});

router.get('/:id', async (req, res) => {
    let bowserId = req.params.id
    try {
        const bowsers = await Bowser.findById(new mongoose.Types.ObjectId(bowserId)).populate('currentTrip');
        res.status(200).json(bowsers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', details: error });
    }
});

// Update or add details
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { data } = req.body;

    try {
        // Find and update the Bowser by its ID
        const updatedBowser = await Bowser.findByIdAndUpdate(
            new mongoose.Types.ObjectId(id), // Ensure the ID is a valid ObjectId
            { $set: data }, // Update the document with the provided data
            { new: true } // Return the updated document
        )

        if (!updatedBowser) return res.status(404).json({ error: 'Bowser not found' });

        res.status(200).json(updatedBowser);
    } catch (error) {
        console.error('Error updating Bowser:', error);
        res.status(500).json({ error: 'Failed to update Bowser', details: error });
    }
});


// Delete a user
router.delete('/:id', async (req, res) => {
    try {
        const bowser = await Bowser.findByIdAndDelete(new mongoose.Types.ObjectId(req.params.id));
        if (!bowser) return res.status(404).json({ error: 'Bowser not found' });
        res.status(200).json({ message: 'Bowser deleted', bowser });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete bowser', details: error });
    }
});

module.exports = router;
