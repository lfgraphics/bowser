const express = require('express');
const router = express.Router();
const FormData = require('../models/formData');

router.post('/', async (req, res) => {
    try {
        const formData = new FormData(req.body);
        
        const saveOptions = { 
            writeConcern: { 
                w: 'majority', 
                wtimeout: 30000
            }
        };
        
        const savePromise = formData.save(saveOptions);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Save operation timed out')), 35000)
        );

        await Promise.race([savePromise, timeoutPromise]);
        
        res.status(200).json({ message: 'Data Submitted successfully' });
    } catch (err) {
        console.error('Error saving form data:', err);
        
        if (err.message === 'Save operation timed out') {
            res.status(503).json({
                message: 'The database operation timed out. Please try again later.',
                error: 'Database timeout'
            });
        } else if (err.name === 'MongooseError' && err.message.includes('buffering timed out')) {
            res.status(503).json({
                message: 'The database is currently unavailable. Please try again later.',
                error: 'Database connection timeout'
            });
        } else {
            res.status(500).json({
                message: 'An error occurred while saving the form data',
                error: err.message
            });
        }
    }
});

module.exports = router;