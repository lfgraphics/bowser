import { Router } from 'express';
const router = Router();
import { findByIdAndUpdate as updateFuelingOrder } from '../models/fuelingOrders.js';
import { updateMany as updateManyFuelRequests } from '../models/FuelRequest.js';

router.post('/request-seen', async (req, res) => {
    const { ids } = req.body;
    if (!ids) {
        return res.status(400).json({ error: 'IDs are required' });
    }
    try {
        const updatedRequests = await updateManyFuelRequests(
            { _id: { $in: ids } },
            { $set: { seen: true } },
            { new: true }
        );
        if (updatedRequests.modifiedCount === 0) {
            return res.status(404).json({ error: 'No fuel requests found' });
        }
        res.status(200).json({ message: `Updated ${updatedRequests.modifiedCount} requests` });
    } catch (error) {
        console.error('Error in request-seen:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/order-seen', async (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'ID is required' });
    }
    try {
        const updatedOrder = await updateFuelingOrder(
            id,
            { $set: { seen: true } },
            { new: true }
        );
        if (!updatedOrder) {
            return res.status(404).json({ error: 'Fueling order not found' });
        }
        res.status(200).json(updatedOrder);
    } catch (error) {
        console.error('Error in order-seen:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;