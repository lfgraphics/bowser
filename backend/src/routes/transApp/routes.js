import { Router } from 'express';
const router = Router();
import Route from '../../models/Route.js';
import Joi from 'joi';
import { ObjectId } from 'mongodb';

const schema = Joi.object({
    Name: Joi.string().required(),
    State: Joi.string().required(),
});

// C
router.post('/', async (req, res) => {
    try {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const route = new Route(value);
        await route.save();
        res.send(route);
    }
    catch (error) {
        console.error('Error creating route:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// R
router.get('/', async (req, res) => {
    const query = req.query.search;

    if (query && ObjectId.isValid(query)) {
        const route = await Route.findById(query);
        if (!route) {
            return res.status(404).json({ error: 'Route not found.' });
        }
        return res.send(route);
    } else {
        try {
            const routes = await Route.find({
                $or: [
                    { Name: { $regex: query, $options: 'i' } },
                    { CustomerName: { $regex: query, $options: 'i' } },
                    { MailingName: { $regex: query, $options: 'i' } },
                    { Location: { $regex: query, $options: 'i' } },
                    { State: { $regex: query, $options: 'i' } },
                    { Country: { $regex: query, $options: 'i' } },
                ]
            }).lean();
            res.send(routes);
        }
        catch (error) {
            console.error('Error fetching routes:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
});

// U
router.put('/update/:id', async (req, res) => {
    try {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const route = await Route.findByIdAndUpdate(req.params.id, value, { new: true });
        res.send(route);
    }
    catch (error) {
        console.error('Error updating route:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// D
router.delete('/delete/:id', async (req, res) => {
    try {
        const route = await Route.findByIdAndDelete(req.params.id);
        res.send(route);
    }
    catch (error) {
        console.error('Error deleting route:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;