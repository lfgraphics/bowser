const express = require('express');
const router = express.Router();
const Driver = require('../models/driver');

router.get('/:searchTerm', async (req, res) => {
    const searchTerm = req.params.searchTerm;

    try {
        console.log('Attempting to search for drivers with term:', searchTerm);
        const drivers = await Driver.find({
            $or: [
                { Name: { $regex: searchTerm, $options: 'i' } },
                { ITPLId: { $regex: searchTerm, $options: 'i' } },
                { 'MobileNo.MobileNo': { $regex: searchTerm, $options: 'i' } }
            ]
        }).exec();

        console.log('Search completed. Found', drivers.length, 'drivers');

        if (drivers.length === 0) {
            return res.status(404).json({ message: 'No driver found with the given search term' });
        }

        res.status(200).json(drivers);
    } catch (err) {
        console.error('Error searching drivers:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

module.exports = router;