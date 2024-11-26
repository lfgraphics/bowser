const express = require('express');
const router = express.Router();
const Update = require('../models/updates');

// Get all users with roles populated
router.get('/', async (req, res) => {
    try {
        const updates = await Update.find().sort({ pushDate: -1 }).exec();
        res.status(200).json(updates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', details: error });
    }
});

module.exports = router;