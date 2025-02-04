const express = require('express');
const { calculateQty } = require('../utils/calibration');
const Bowsers = require('../models/Bowsers');

const router = express.Router();

router.post('/calib-calc', async (req, res) => {
    const { bowser, chamberId, levelHeight } = req.body;

    try {
        // Extract chambers from the bowser object
        const bowserData = await Bowsers.findOne({ regNo: { $regex: bowser, $options: "i" } }, 'chambers');
        if (!bowserData || !bowserData.chambers) {
            return res.status(404).json({ success: false, message: "Bowser not found or has no chambers." });
        }
        const bowserChambers = bowserData.chambers;

        // Calculate quantity using the calculateQty function
        const qty = calculateQty(bowserChambers, chamberId, levelHeight);
        return res.status(200).json({ success: true, quantity: qty });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;