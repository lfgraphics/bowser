import { Router } from 'express';
const router = Router();
import { find as findAttachedVehicle } from '../models/attatchedVehicle.js';

router.get('/search/:vehicleNumber', async (req, res) => {
    const vehicleNumber = req.params.vehicleNumber;

    try {
        const vehicles = await findAttachedVehicle({
            VehicleNo: { $regex: vehicleNumber, $options: 'i' }
        }).exec();

        if (vehicles.length === 0) {
            return res.status(404).json({ message: 'No vehicle found with the given search term' });
        }
        res.status(200).json(vehicles);
    } catch (err) {
        console.error('Error searching vehicles:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

export default router;
