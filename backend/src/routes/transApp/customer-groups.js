import { Router } from 'express';
const router = Router();
import CustomerGroup from '../../models/CustomerGroup.js';
import Joi from 'joi';

const schema = Joi.object({
    Name: Joi.string().required(),
    State: Joi.string().required()
});

// C
router.post('/', async (req, res) => {
    try {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const customerGroup = new CustomerGroup(value);
        await customerGroup.save();
        res.send(customerGroup);
    }
    catch (error) {
        console.error('Error creating customer group:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// R
router.get('/', async (req, res) => {
    const query = req.query.search;
    try {
        const customerGroups = await CustomerGroup.find({
            $or: [
                { Name: { $regex: query, $options: 'i' } },
                { State: { $regex: query, $options: 'i' } },
            ]
        }).lean();
        res.send(customerGroups);
    }
    catch (error) {
        console.error('Error fetching customer groups:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/get/:id', async (req, res) => {
    try {
        const customerGroup = await CustomerGroup.findById(req.params.id).lean();
        res.send(customerGroup);
    }
    catch (error) {
        console.error('Error fetching customer group:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// U
router.put('/update/:id', async (req, res) => {
    try {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const customerGroup = await CustomerGroup.findByIdAndUpdate(req.params.id, value, { new: true });
        res.send(customerGroup);
    }
    catch (error) {
        console.error('Error updating customer group:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// D
router.delete('/delete/:id', async (req, res) => {
    try {
        const customerGroup = await CustomerGroup.findByIdAndDelete(req.params.id);
        res.send(customerGroup);
    }
    catch (error) {
        console.error('Error deleting customer group:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;