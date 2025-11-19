import { Router } from 'express';
import loginRoutes from './login.js';
import profileManagementRoutes from './profile-management.js';
import vehiclesRoutes from './fetch-vehicles.js';
import tripUpdateRoutes from './update-in-trip.js';
import stackHoldersRoutes from './stack-holders.js';
import goodsRoutes from './goods.js';
import loadingNotificationRoutes from './loading-notification.js';
import loadedTripsRoutes from './loaded-trips.js';


const router = Router();

router.use('/login', loginRoutes);
router.use('/manage-profile', profileManagementRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/trip-update', tripUpdateRoutes);
router.use('/stack-holders', stackHoldersRoutes);
router.use('/goods', goodsRoutes);
router.use('/loading-notification', loadingNotificationRoutes);
router.use('/loaded-trips', loadedTripsRoutes)

export default router;