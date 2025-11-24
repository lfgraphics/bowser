import { Router } from 'express';
const router = Router();
import MorningUpdate, { find as findMorningUpdates, countDocuments as countMorningUpdateDocuments, findById as findMorningUpdateById } from '../models/MorningUpdate.js';

// Utility: build date range query
const buildDateRangeQuery = (startDate, endDate) => {
    const query = {};
    
    if (!startDate && !endDate) {
        // If no dates provided, use current date from 00:00:00 to 23:59:59
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        query.$gte = startOfDay;
        query.$lte = endOfDay;
    } else {
        if (startDate) {
            // Set to start of day (00:00:00)
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            query.$gte = start;
        }
        if (endDate) {
            // Set to end of day (23:59:59)
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.$lte = end;
        }
    }
    
    return { openingTime: query };
};

// Utility: get pagination
const getPagination = (req) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

// ✅ GET all updates (paginated + optional date range)
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { skip, limit, page } = getPagination(req);
        const dateQuery = buildDateRangeQuery(startDate, endDate);

        const [data, total] = await Promise.all([
            findMorningUpdates(dateQuery)
                .populate('report.trip')
                .populate('report.driver')
                .skip(skip)
                .limit(limit),
            countMorningUpdateDocuments(dateQuery),
        ]);

        res.json({
            page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            data,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch updates' });
    }
});

// ✅ GET update by ID (no pagination needed)
router.get('/:id', async (req, res) => {
    try {
        const update = await findMorningUpdateById(req.params.id)
            .populate('report.trip')
            .populate('report.driver');
        if (!update) return res.status(404).json({ error: 'Update not found' });
        res.json(update);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch update' });
    }
});

// ✅ GET updates by user._id (paginated + optional date range)
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;
        const { skip, limit, page } = getPagination(req);

        const query = {
            'user._id': userId,
            ...buildDateRangeQuery(startDate, endDate),
        };

        const [data, total] = await Promise.all([
            findMorningUpdates(query)
                .populate('report.trip')
                .populate('report.driver')
                .skip(skip)
                .limit(limit),
            countMorningUpdateDocuments(query),
        ]);

        res.json({
            page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            data,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user updates' });
    }
});

// ✅ GET updates by vehicle number (paginated + optional date range)
router.get('/vehicle/:vehicleNo', async (req, res) => {
    try {
        const { vehicleNo } = req.params;
        const { startDate, endDate } = req.query;
        const { skip, limit, page } = getPagination(req);

        const matchStage = {
            ...buildDateRangeQuery(startDate, endDate),
            report: { $elemMatch: { vehicleNo } },
        };

        const [data, total] = await Promise.all([
            findMorningUpdates(matchStage)
                .populate('report.trip')
                .populate('report.driver')
                .skip(skip)
                .limit(limit),
            countMorningUpdateDocuments(matchStage),
        ]);

        res.json({
            page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            data,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch vehicle updates' });
    }
});

// ✅ CREATE a new morning update
router.post('/', async (req, res) => {
    try {
        const { user, openingTime, report, closingTime, activityLogs } = req.body || {};

        // Basic validations
        if (!user || typeof user !== 'object') {
            return res.status(400).json({ error: 'User object is required' });
        }
        if (!user._id || !user.name) {
            return res.status(400).json({ error: 'User _id and name are required' });
        }
        if (!openingTime) {
            return res.status(400).json({ error: 'openingTime is required' });
        }
        if (!closingTime) {
            return res.status(400).json({ error: 'closingTime is required' });
        }
        if (!Array.isArray(report) || report.length === 0) {
            return res.status(400).json({ error: 'report must not be empty' });
        }

        // Validate report entries - remark can be empty for reported vehicles
        const invalidIndex = report.findIndex(
            (r) => !r || typeof r !== 'object' || !r.vehicleNo || !r.location || typeof r.remark !== 'string'
        );
        if (invalidIndex !== -1) {
            return res.status(400).json({
                error: `Each report entry must include vehicleNo and location (invalid at index ${invalidIndex})`,
            });
        }

        // Optional activityLogs validation
        if (activityLogs !== undefined) {
            if (!Array.isArray(activityLogs)) {
                return res.status(400).json({ error: 'activityLogs must be an array' });
            }
            const invalidLogIndex = activityLogs.findIndex(
                (log) => !log || !log.timestamp || !log.type || typeof log.type !== 'string'
            );
            if (invalidLogIndex !== -1) {
                return res.status(400).json({
                    error: `Invalid activity log at index ${invalidLogIndex}: timestamp and type are required`
                });
            }
        }

        const newUpdate = new MorningUpdate({
            user: { _id: user._id, name: user.name },
            openingTime,
            report,
            closingTime,
            activityLogs: activityLogs || [],
        });

        const savedUpdate = await newUpdate.save();

        // Populate the saved document before returning
        const populatedUpdate = await findMorningUpdateById(savedUpdate._id)
            .populate('report.trip')
            .populate('report.driver');

        return res.status(201).json(populatedUpdate);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to create morning update' });
    }
});

export default router;
