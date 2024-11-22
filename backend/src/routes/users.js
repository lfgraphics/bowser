const express = require('express');
const router = express.Router();
const User = require('../models/user');
const mongoose = require('mongoose')

// Get all users with roles populated
router.get('/', async (req, res) => {
    try {
        const users = await User.find().populate('roles').exec();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', details: error });
    }
});

// Update verification status
router.put('/:id/verify', async (req, res) => {
    const { verified } = req.body;
    try {
        const user = await User.findOneAndUpdate(
            { userId: req.params.id },
            { verified },
            { new: true } // Ensure the updated document is returned
        ).populate('roles'); // Populate any referenced fields like roles

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.status(200).json(user); // Send the fully updated user object
    } catch (error) {
        res.status(500).json({ error: 'Failed to update verification status', details: error });
    }
});

// Update or add roles
router.put('/:id/roles', async (req, res) => {
    const { roles } = req.body;
    try {
        const user = await User.findOne({ userId: req.params.id });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const roleObjectIds = roles.map((role) => new mongoose.Types.ObjectId(role));

        user.roles = roleObjectIds;
        await user.save();

        const updatedUser = await User.findOne({ userId: req.params.id }).populate("roles");
        if (!updatedUser) return res.status(404).json({ error: "User not found" });
        res.status(200).json(updatedUser);

    } catch (error) {
        console.error('Error updating roles:', error);
        res.status(500).json({ error: 'Failed to update roles', details: error });
    }
});

// Delete a user
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findOneAndDelete({ userId: req.params.id });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ message: 'User deleted', user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user', details: error });
    }
});

module.exports = router;
