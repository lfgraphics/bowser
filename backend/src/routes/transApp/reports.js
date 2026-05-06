import express from 'express';
import { find as findTrips } from '../../models/VehiclesTrip.js';
import moment from 'moment-timezone';

const router = express.Router();

router.get('/trips-report', async (req, res) => {
    try {
        const { startDate, endDate, loadStatus, startFrom, type } = req.query;
        let query = {};

        // Base filters
        if (loadStatus !== undefined && loadStatus !== '' && loadStatus !== 'all') {
            query.LoadStatus = parseInt(loadStatus);
        }

        if (startFrom) {
            query.StartFrom = { $regex: startFrom, $options: 'i' };
        }

        if (type === 'today') {
            const todayStart = moment().tz('Asia/Kolkata').startOf('day').toDate();
            const todayEnd = moment().tz('Asia/Kolkata').endOf('day').toDate();
            query.StartDate = { $gte: todayStart, $lte: todayEnd };
        } else if (type === 'yesterday') {
            const yesterdayStart = moment().tz('Asia/Kolkata').subtract(1, 'days').startOf('day').toDate();
            const yesterdayEnd = moment().tz('Asia/Kolkata').subtract(1, 'days').endOf('day').toDate();
            query.StartDate = { $gte: yesterdayStart, $lte: yesterdayEnd };
        } else if (startDate) {
            const start = moment.tz(startDate, 'Asia/Kolkata').startOf('day').toDate();
            const end = endDate 
                ? moment.tz(endDate, 'Asia/Kolkata').endOf('day').toDate()
                : moment.tz(startDate, 'Asia/Kolkata').endOf('day').toDate();
            query.StartDate = { $gte: start, $lte: end };
        }

        console.log('Executing Trips Report Query:', query);

        const trips = await findTrips(query).sort({ StartDate: -1 }).limit(1000).lean();

        res.json({
            success: true,
            count: trips.length,
            trips
        });
    } catch (error) {
        console.error('Error fetching trips report:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
