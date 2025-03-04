const express = require('express');
const router = express.Router();
const FuelingOrder = require('../models/fuelingOrders');

router.get('/:phoneNo', async (req, res) => {
    try {
        const { phoneNo } = req.params;

        const userOrders = await FuelingOrder.find({ 'bowser.driver.phoneNo': phoneNo, fulfilled: false }).populate('request').sort({ createdAt: -1 });
        if (userOrders.length === 0) {
            return res.status(404).json({ message: 'आप के लिए कोई भी ऑर्डर मौजूद नहीं है|' });
        }

        res.status(200).json({ orders: userOrders });
    } catch (error) {
        console.error(`Error fetching fueling orders for ${phoneNo}:`, error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
