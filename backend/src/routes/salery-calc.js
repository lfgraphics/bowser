import { Router } from 'express';
const router = Router();
import { findById as findSaleryCalcById, findOneAndUpdate as updateSaleryCalc } from '../models/SaleryCalc.js';
import { mongoose } from 'mongoose';

router.get('/', async (req, res) => {
    let saleryCalc = await findSaleryCalcById('679e27701c5931b42c74e5b0')
    res.status(200).json({ saleryCalc, message: 'Welcome to Bowser Fuel Management System!' });
});

router.post('/', async (req, res) => {
    const { foodingRate, saleryRate, rewardRate } = req.body
    let saleryCalc = await updateSaleryCalc(
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

export default router;