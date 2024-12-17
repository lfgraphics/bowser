const express = require('express');
const router = express.Router();
const FuelingTransaction = require('../models/fuelingTransaction');
const FuelingOrder = require('../models/fuelingOrders');

router.get('/:phoneNo', async (req, res) => {
    try {
        const { phoneNo } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get all order IDs for the user
        const userOrders = await FuelingOrder.find({ 'bowser.driver.phoneNo': phoneNo }).sort({ createdAt: -1 });
        const userOrderIds = userOrders.map(order => order._id);

        // Find completed orders
        const completedOrders = await FuelingTransaction.find({ orderId: { $in: userOrderIds } }, 'orderId');
        const completedOrderIds = new Set(completedOrders.map(order => order.orderId.toString()));
        // Filter out completed orders
        const pendingOrderIds = userOrderIds.filter(id => !completedOrderIds.has(id.toString()));
        // Fetch all user orders and filter out completed orders in one go
        const orders = userOrders.filter(order => !completedOrderIds.has(order._id.toString())).slice(skip, skip + limit);

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
