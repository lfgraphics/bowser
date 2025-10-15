import { Router } from 'express';
import { verifyCampUserToken } from '../../middleware/auth.js';
import { getLatestTripsOnCamps } from './utils.js';

const router = Router();

// Get latest vehicles at user's locations
router.get('/latest', verifyCampUserToken, async (req, res) => {
    try {
        const trips = await getLatestTripsOnCamps(req.user._id);
        res.json({
            success: true,
            count: trips.length,
            data: trips
        });
    } catch (error) {
        console.error('Error fetching latest vehicles:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch latest vehicles',
            error: error.message 
        });
    }
});

// Dashboard endpoint for officers - get latest vehicles at user's locations  
router.get('/dashboard', verifyCampUserToken, async (req, res) => {
    try {
        const trips = await getLatestTripsOnCamps(req.user._id);
        res.json({
            success: true,
            count: trips.length,
            data: trips,
            userLocations: req.user.locations || []
        });
    } catch (error) {
        console.error('Error fetching dashboard vehicles:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch dashboard vehicles',
            error: error.message 
        });
    }
});

export default router;