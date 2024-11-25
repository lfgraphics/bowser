const express = require('express');
const router = express.Router();
const Bowser = require('../models/bowser');
const mongoose = require('mongoose')

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
        const bowsers = await Bowser.findById(new mongoose.Types.ObjectId(bowserId));
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
