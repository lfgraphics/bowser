const express = require('express');
const router = express.Router();
const SaleryCalc = require('../models/SaleryCalc');
const { mongoose } = require('mongoose');

router.get('/', async (req, res) => {
    let saleryCalc = await SaleryCalc.findById('679e27701c5931b42c74e5b0')
    res.status(200).json({ saleryCalc, message: 'Welcome to Bowser Fuel Management System!' });
});

router.post('/', async (req, res) => {
    const { foodingRate, saleryRate, rewardRate } = req.body
    let saleryCalc = await SaleryCalc.findOneAndUpdate(
        { _id: "679e27701c5931b42c74e5b0" },
        {
            foodingRate: foodingRate,
            saleryRate: saleryRate,
            rewardRate: rewardRate,
        }, { new: true })
    if (!saleryCalc) {
        return res.status(404).json({ message: 'Salery calculation not found.' });
    }
    res.status(200).json({ message: 'Salery calculation updated successfully', saleryCalc });
});

module.exports = router;