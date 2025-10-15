import { Router } from 'express';
const router = Router();

import authRouts from './auth.js';
import adminRouts from './admin.js';
import profileRouts from './profile.js';
import vehiclesRouts from './vehicles.js';

router.use('/auth', authRouts);
router.use('/admin', adminRouts);
router.use('/profile', profileRouts);
router.use('/vehicles', vehiclesRouts);

export default router;