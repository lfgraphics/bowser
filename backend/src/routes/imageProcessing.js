const express = require('express');
const router = express.Router();
const { processImage } = require('../services/imageProcessing');

router.post('/', async (req, res) => {
    const { image } = req.body;
    if (!image) {
        console.error('No imageUri provided');
        return res.status(400).send('Image URI is required');
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        await processImage(image, res);
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).send('Error processing image');
    }
});

module.exports = router;