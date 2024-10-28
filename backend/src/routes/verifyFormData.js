const express = require('express');
const router = express.Router();
const FormData = require('../models/formData');

// Get all fueling records
router.get('/', async (req, res) => {
    try {
        const records = await FormData.find({ verified: { $ne: true } });
        res.json(records);
    } catch (error) {
        console.error('Error fetching fueling records:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update a specific fueling record
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { verified, ...updateData } = req.body;

    try {
        const updatedRecord = await FormData.findByIdAndUpdate(
            id,
            { ...updateData, verified },
            { new: true }
        );

        if (!updatedRecord) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.json(updatedRecord);
    } catch (error) {
        console.error('Error updating fueling record:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;