const express = require('express');
const router = express.Router();
const FormData = require('../models/formData');
const FuelingOrder = require('../models/fuelingOrders');

router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get all order IDs for the user
        const userOrders = await FuelingOrder.find({'bowserDriver.userId': userId}, '_id');
        const userOrderIds = userOrders.map(order => order._id);

        // Find completed orders
        const completedOrders = await FormData.find({ orderId: { $in: userOrderIds } }, 'orderId');
        const completedOrderIds = new Set(completedOrders.map(order => order.orderId.toString()));

        // Filter out completed orders
        const pendingOrderIds = userOrderIds.filter(id => !completedOrderIds.has(id.toString()));
        // Fetch pending orders with pagination
        const orders = await FuelingOrder.find({ _id: { $in: pendingOrderIds } })
            .skip(skip)
            .limit(limit);

        const total = pendingOrderIds.length;

        res.json({
            orders,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalOrders: total
        });
    } catch (error) {
        console.error(`Error fetching fueling orders for user ID ${req.params.userId}:`, error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
