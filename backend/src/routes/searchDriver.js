const express = require('express');
const router = express.Router();
const Driver = require('../models/driver');
const User = require('../models/user');
const mongoose = require('mongoose');

router.get('/:searchTerm', async (req, res) => {
    const searchTerm = req.params.searchTerm;

    try {
        const drivers = await Driver.find({
            $or: [
                { Name: { $regex: searchTerm, $options: 'i' } },
                { ITPLId: { $regex: searchTerm, $options: 'i' } },
                { 'MobileNo.MobileNo': { $regex: searchTerm, $options: 'i' } }
            ]
        }).exec();

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

router.get('/bowser-drivers/:userId', async (req, res) => {
    const userId = req.params.userId;
    const bowserDriverRoleId = '6710ddc21e5c7dc410e64e34'; // ObjectId for the bowser driver role

    try {

        // Find users with a userId that matches the search term (using regex for partial match)
        const users = await User.find({ userId: { $regex: userId, $options: 'i' } });

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }


        // Filter users to only those with the bowser driver role
        const bowserDrivers = users.filter(user => 
            user.roles.some(role => role.toString() === bowserDriverRoleId)
        );

        if (bowserDrivers.length === 0) {
            return res.status(404).json({ message: 'No users found with the bowser driver role' });
        }


        // Return the filtered list of bowser drivers
        res.status(200).json(bowserDrivers);
    } catch (err) {
        console.error('Error searching bowser drivers:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

module.exports = router;
