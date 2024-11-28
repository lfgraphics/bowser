const express = require('express');
const router = express.Router();
const Update = require('../models/updates');

// Get all users with roles populated
router.get('/', async (req, res) => {
    try {
        const updates = await Update.find().sort({ buildVersion: -1 }).exec();
        res.status(200).json(updates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch updates', details: error });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const update = await Update.findOne(req.params.id);
        res.status(200).json(update);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch update', details: error });
    }
});
router.post('/', async (req, res) => {
    try {
        let newUpdate = new Update(req.body)
        const saveOptions = {
            writeConcern: {
                w: 'majority',
                wtimeout: 30000
            }
        };

        const savePromise = newUpdate.save(saveOptions);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Save operation timed out')), 35000)
        );

        await Promise.race([savePromise, timeoutPromise]);

        res.status(200).json({ message: 'Data Submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', details: error });
    }
});
router.delete('/:id', async (req, res) => {
    let { updateId } = req.params
    try {
        await Update.deleteOne(updateId);
        res.status(200).json({ title: 'Operation Successful', message:'Deleted updated successfully' })
    } catch (err) {
        res.status(400).json({ title: err.title, message: err.message })
    }
})
module.exports = router;