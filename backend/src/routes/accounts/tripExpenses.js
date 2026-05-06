import { Router } from 'express';
const router = Router();
import TripExpenseMaster from '../../models/TripExpenseMaster.js';
import Joi from 'joi';

const expenseMasterSchema = Joi.object({
    _id: Joi.string().optional(),
    from: Joi.string().required(),
    to: Joi.string().required(),
    wheelType: Joi.string().valid('12 Wheeler', '14 Wheeler', '16 Wheeler', '22 Wheeler', '16 Trellar', '22 Trellar').required(),
    days: Joi.number().required(),
    running: Joi.object({
        perDay: Joi.number().required(),
        efffectiveFrom: Joi.date().required(),
    }).required(),
    return: Joi.object({
        total: Joi.number().required(),
        efffectiveFrom: Joi.date().required(),
    }).required(),
    fooding: Joi.object({
        perDay: Joi.number().required(),
        efffectiveFrom: Joi.date().required(),
    }).required(),
    incentive: Joi.object({
        total: Joi.number().required(),
        efffectiveFrom: Joi.date().required(),
    }).optional(),
    parking: Joi.object({
        perDay: Joi.number().required(),
        efffectiveFrom: Joi.date().required(),
    }).optional(),
    other: Joi.array().items(Joi.object({
        type: Joi.string().required(),
        amount: Joi.number().required(),
        efffectiveFrom: Joi.date().required(),
    })).optional(),
    totalExpense: Joi.number().required(),
    __v: Joi.number().optional(),
});

// C
router.post('/', async (req, res) => {
    const { error, value } = expenseMasterSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    try {
        const expenseMaster = await TripExpenseMaster.create(value);
        res.status(201).json(expenseMaster);
    } catch (error) {
        console.error('Error creating expense master:', error);
        res.status(500).json({ message: 'System error occurred while creating expense master. Please try again later.' });
    }
});

// R — with cursor pagination
router.get('/', async (req, res) => {
    const { from, to, wheelType, id, cursor, limit: rawLimit } = req.query;
    try {
        // Single document lookup by id
        if (id) {
            const expenseMaster = await TripExpenseMaster.findById(id);
            if (!expenseMaster) {
                return res.status(404).json({ message: 'Expense master not found' });
            }
            return res.status(200).json(expenseMaster);
        }

        // Build filter query from state-driven params
        const query = {};
        if (from) query.from = from;
        if (to) query.to = to;
        if (wheelType) query.wheelType = wheelType;

        // Cursor pagination: fetch items with _id < cursor (since sorted desc)
        if (cursor) {
            query._id = { $lt: cursor };
        }

        const pageLimit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 100);

        // Fetch one extra to determine if there are more pages
        const expenseMasters = await TripExpenseMaster
            .find(query)
            .sort({ _id: -1 })
            .limit(pageLimit + 1)
            .lean();

        const hasMore = expenseMasters.length > pageLimit;
        const data = hasMore ? expenseMasters.slice(0, pageLimit) : expenseMasters;
        const nextCursor = hasMore ? data[data.length - 1]._id : null;

        res.status(200).json({ data, nextCursor, hasMore });
    } catch (error) {
        console.error('Error fetching expense masters:', error);
        res.status(500).json({ message: 'System error occurred while fetching expense masters. Please try again later.' });
    }
});

// U
router.put('/:id', async (req, res) => {
    const { error, value } = expenseMasterSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    try {
        const expenseMaster = await TripExpenseMaster.findByIdAndUpdate(req.params.id, value, { new: true });
        if (!expenseMaster) {
            return res.status(404).json({ message: 'Expense master not found' });
        }
        res.status(200).json(expenseMaster);
    } catch (error) {
        console.error('Error updating expense master:', error);
        res.status(500).json({ message: 'System error occurred while updating expense master. Please try again later.' });
    }
});

// D
router.delete('/:id', async (req, res) => {
    try {
        const expenseMaster = await TripExpenseMaster.findByIdAndDelete(req.params.id);
        if (!expenseMaster) {
            return res.status(404).json({ message: 'Expense master not found' });
        }
        res.status(200).json(expenseMaster);
    } catch (error) {
        console.error('Error deleting expense master:', error);
        res.status(500).json({ message: 'System error occurred while deleting expense master. Please try again later.' });
    }
});

export default router;