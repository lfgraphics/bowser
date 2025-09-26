const express = require('express');
const router = express.Router();
const StackHolder = require('../../models/StackHolders');

router.get('/', async (req, res) => {
    const { params } = req.query;
    try {
        const stackHolders = await StackHolder.find({
            $and: [
                { Location: { $exists: true } },
                { Location: { $ne: null } },
                { InstitutionName: { $exists: true } },
                { InstitutionName: { $ne: null } },
                {
                    $or: [
                        { InstitutionName: { $regex: params, $options: 'i' } },
                        { Location: { $regex: params, $options: 'i' } },
                        { shrortName: { $regex: params, $options: 'i' } }
                    ]
                }
            ]
        }).sort({ _id: -1 }).limit(20).lean();
        res.status(200).json(stackHolders);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stack holders' });
    }
});

router.get('/system/:params', async (req, res) => {
    const { params } = req.params;
    try {
        const stackHolders = await StackHolder.find({
            $or: [
                { InstitutionName: params },
                { Location: params },
            ]
        }).sort({ _id: -1 }).limit(20).lean();
        res.status(200).json(stackHolders);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stack holders' });
    }
});

router.post('/', async (req, res) => {
    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ message: 'Stack Holder data is required' });
    }

    try {
        const existingStation = await StackHolder.findOne(data);
        if (existingStation) {
            return res.status(400).json({ message: 'Stack Holder already exists' });
        }

        const newStation = new StackHolder(data);
        await newStation.save();
        res.status(201).json(newStation);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create stack holder' });
    }
});

router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { data } = req.body;

    if (!data) {
        return res.status(400).json({ message: 'Stack Holder name is required' });
    }

    try {
        const updatedStation = await StackHolder.findByIdAndUpdate(id, data, { new: true });
        if (!updatedStation) {
            return res.status(404).json({ message: 'Stack Holder not found' });
        }
        res.status(200).json(updatedStation);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update stack holder' });
    }
});

router.patch('/update-loading-supervisor/:id', async (req, res) => {
    const { id } = req.params;
    const { loadingSupervisor } = req.body;

    if (!loadingSupervisor || !id) {
        return res.status(400).json({ message: 'Loading Supervisor and Location are required' });
    }

    try {
        const updatedStation = await StackHolder.findByIdAndUpdate(
            id,
            { loadingSupervisor: loadingSupervisor },
            { new: true }
        );
        if (!updatedStation) {
            return res.status(404).json({ message: 'Stack Holder not found for the given location' });
        }
        res.status(200).json(updatedStation);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update loading supervisor' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedStation = await StackHolder.findByIdAndDelete(id);
        if (!deletedStation) {
            return res.status(404).json({ message: 'Stack Holder not found' });
        }
        res.status(200).json({ message: 'Stack Holder deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete stack holder' });
    }
});

module.exports = router;