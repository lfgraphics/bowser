import { Router } from "express";
import TripExpenses from "../../models/TripExpenses";

const router = Router();

router.get('/find-unpaid-expenses/:vehicleNo', (req, res) => {
    try {
        const { vehicleNo } = req.params;
        const unpaidExpenses = TripExpenses.find({
            vehicleNo,
            $or: [
                { balancePayment: { $gt: 0 } },
                {
                    $and: [
                        { amount: 0 },
                        { balancePayment: 0 }
                    ]
                }
            ]
        }).populate("trip").populate("gr").populate("driver");
        
        res.json(unpaidExpenses);
    } catch (error) {
        console.error('Error fetching unpaid expenses:', error);
        res.status(500).json({ error: 'Failed to fetch unpaid expenses' });
    }
})

router.post('/create-payment-order', (req, res) => {
    try {

    } catch (error) {

    }
})

export default router;