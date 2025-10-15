import { Router } from 'express';
const router = Router();
import { find as findPetrolPumps, countDocuments as countPetrolPumpDocuments, insertMany as insertManyPetrolPumps } from '../models/PetrolPumps.js';

router.get('/', async (req, res) => {
    const { name } = req.query
    if (!name) return res.status(400).json({ error: 'Please provide a search term.' });
    try {
        const petrolPumps = await findPetrolPumps({ $or: [{ name: { $regex: name, $options: 'i' } }, { state: { $regex: name, $options: 'i' } }] }).limit(10);
        res.status(200).json(petrolPumps);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch petrol pumps.', error });
    }
});

router.get('/get', async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    try {
        const totalDocs = await countPetrolPumpDocuments();
        const totalPages = Math.ceil(totalDocs / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedDocs = await findPetrolPumps().skip(startIndex).limit(limit);
        res.status(200).json({
            totalDocs,
            totalPages,
            currentPage: page,
            pageSize: limit,
            pumps: paginatedDocs,
            records: { from: startIndex + 1, to: endIndex > totalDocs ? totalDocs : endIndex }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch petrol pumps.', error });
    }
});

router.post('/', async (req, res) => {
    const petrolPumps = req.body;
    try {
        await insertManyPetrolPumps(petrolPumps);
        res.status(201).json({ message: 'Petrol pumps added successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add petrol pumps.', error });
    }
});

export default router;