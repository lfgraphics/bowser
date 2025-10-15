import { Router } from 'express';
import loginRoutes from './login.js';
import profileManagementRoutes from './profile-management.js';
import vehiclesRoutes from './fetch-vehicles.js';
import tripUpdateRoutes from './update-in-trip.js';
import stackHoldersRoutes from './stack-holders.js';
import goodsRoutes from './goods.js';

const router = Router();

router.use('/login', loginRoutes);
router.use('/manage-profile', profileManagementRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/trip-update', tripUpdateRoutes);
router.use('/stack-holders', stackHoldersRoutes);
router.use('/goods', goodsRoutes);

export default router;