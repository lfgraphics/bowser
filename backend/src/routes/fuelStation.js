const express = require('express');
const router = express.Router();
const FuelStation = require('../models/FuelStations');

router.get('/', async (req, res) => {
    const {name} = req.query;
    try {
        const fuelStations = await FuelStation.find({name: { $regex: name, $options: 'i' }}).sort({ _id: -1 }).limit(20).lean();
        res.status(200).json(fuelStations);
    } catch (error) {
        console.error('Error fetching fuel stations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Fuel station name is required' });
    }

    try {
        const existingStation = await FuelStation.findOne({ name });
        if (existingStation) {
            return res.status(400).json({ error: 'Fuel station already exists' });
        }

        const newStation = new FuelStation({ name });
        await newStation.save();
        res.status(201).json(newStation);
    } catch (error) {
        console.error('Error creating fuel station:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Fuel station name is required' });
    }

    try {
        const updatedStation = await FuelStation.findByIdAndUpdate(id, { name }, { new: true });
        if (!updatedStation) {
            return res.status(404).json({ error: 'Fuel station not found' });
        }
        res.status(200).json(updatedStation);
    } catch (error) {
        console.error('Error updating fuel station:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedStation = await FuelStation.findByIdAndDelete(id);
        if (!deletedStation) {
            return res.status(404).json({ error: 'Fuel station not found' });
        }
        res.status(200).json({ message: 'Fuel station deleted successfully' });
    } catch (error) {
        console.error('Error deleting fuel station:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;