const express = require('express');
const router = express.Router();
const MorningUpdate = require('../models/MorningUpdate');

// Utility: build date range query
const buildDateRangeQuery = (startDate, endDate) => {
    if (!startDate && !endDate) return {};
    const query = {};
    if (startDate) query.$gte = new Date(startDate);
    if (endDate) query.$lte = new Date(endDate);
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
            MorningUpdate.find(dateQuery).skip(skip).limit(limit),
            MorningUpdate.countDocuments(dateQuery),
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
        const update = await MorningUpdate.findById(req.params.id);
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
            MorningUpdate.find(query).skip(skip).limit(limit),
            MorningUpdate.countDocuments(query),
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
            MorningUpdate.find(matchStage).skip(skip).limit(limit),
            MorningUpdate.countDocuments(matchStage),
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

module.exports = router;
