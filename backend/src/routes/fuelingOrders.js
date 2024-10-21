const express = require('express');
const router = express.Router();
const FuelingOrder = require('../models/fuelingOrders');

router.get('/:searchTerm', async (req, res) => {
    const searchTerm = req.params.searchTerm;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        console.log('Attempting to search for orders with term:', searchTerm);
        const orders = await FuelingOrder.find({
            'bowserDriver.User Id': { $regex: searchTerm, $options: 'i' }
        })
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();

        const total = await FuelingOrder.countDocuments({
            'bowserDriver.User Id': { $regex: searchTerm, $options: 'i' }
        });

        console.log('Search completed. Found', total, 'orders');

        if (total === 0) {
            return res.status(404).json({ message: "You don't have any pending orders" });
        }

        res.status(200).json({
            orders,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (err) {
        console.error('Error searching orders:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
