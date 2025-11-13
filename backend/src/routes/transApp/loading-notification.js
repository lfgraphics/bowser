import { Router } from 'express';
const router = Router();
import LoadingOrderNotification from '../../models/LoadingOrderNotification.js';
import { sendWebPushNotification } from '../../utils/pushNotifications.js';

router.post('/', async (req, res) => {
    const { tripId, destinationId, destinationName, to, from, location, vehicle } = req.body;
    if (!tripId || !destinationId || !destinationName || !to || !from || !location) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    try {
        const loadingOrderNotification = new LoadingOrderNotification({
            tripId,
            vehicle,
            destinationId,
            destinationName,
            location,
            to,
            from
        });

        await loadingOrderNotification.save();

        await sendWebPushNotification(
            {
                userId: to,
                message: `Send ${vehicle} to ${location} at ${destinationName}.\n${from}`,
                options: {
                    title: 'New Loading Order',
                    url: `/trans-app/notifications`,
                    id: loadingOrderNotification._id,
                    icon: '/icons/setplan.svg'
                }
            }
        );
        res.status(201).json(loadingOrderNotification);
    } catch (error) {
        console.error('Error creating loading order notification:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/', async (req, res) => {
    try {
        const notifications = await LoadingOrderNotification.find().sort({ sentAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching loading order notifications:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/by-id/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const notification = await LoadingOrderNotification.findById(id);
        if (!notification) {
            return res.status(404).json({ error: 'Loading order notification not found.' });
        }
        res.status(200).json(notification);
    } catch (error) {
        console.error('Error fetching loading order notification:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/by-user/:userId', async (req, res) => {
    const { userId } = req.params;
    const { status: notificationStatus = 'pending', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!userId) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    const filter = { to: { $regex: userId } };
    if (notificationStatus !== 'all') filter.status = notificationStatus;
    try {
        const notifications = await LoadingOrderNotification.find(filter).skip(skip).limit(Number(limit)).sort({ sentAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching loading order notifications:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;