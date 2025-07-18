const express = require('express');
const router = express.Router();
const StackHolder = require('../../models/StackHolders');

router.get('/', async (req, res) => {
    const { params } = req.query;
    try {
        const stackHolders = await StackHolder.find({
            $or: [
                { InstitutionName: { $regex: params, $options: 'i' } },
                { Location: { $regex: params, $options: 'i' } }
            ]
        }).sort({ _id: -1 }).limit(20).lean();
        res.status(200).json(stackHolders);
    } catch (error) {
        console.error('Error fetching stack holders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', async (req, res) => {
    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ error: 'Stack Holder data is required' });
    }

    try {
        const existingStation = await StackHolder.findOne(data);
        if (existingStation) {
            return res.status(400).json({ error: 'Stack Holder already exists' });
        }

        const newStation = new StackHolder(data);
        await newStation.save();
        res.status(201).json(newStation);
    } catch (error) {
        console.error('Error creating stack holder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { data } = req.body;

    if (!data) {
        return res.status(400).json({ error: 'Stack Holder name is required' });
    }

    try {
        const updatedStation = await StackHolder.findByIdAndUpdate(id, data, { new: true });
        if (!updatedStation) {
            return res.status(404).json({ error: 'Stack Holder not found' });
        }
        res.status(200).json(updatedStation);
    } catch (error) {
        console.error('Error updating stack holder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedStation = await StackHolder.findByIdAndDelete(id);
        if (!deletedStation) {
            return res.status(404).json({ error: 'Stack Holder not found' });
        }
        res.status(200).json({ message: 'Stack Holder deleted successfully' });
    } catch (error) {
        console.error('Error deleting stack holder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;