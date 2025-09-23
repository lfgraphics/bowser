const express = require('express');
const router = express.Router();

const loginRoutes = require('./login');
const profileManagementRoutes = require('./profile-management');
const vehiclesRoutes = require('./fetch-vehicles');
const tripUpdateRoutes = require('./update-in-trip');
const stackHoldersRoutes = require('./stack-holders');
const goodsRoutes = require('./goods');

router.use('/login', loginRoutes);
router.use('/manage-profile', profileManagementRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/trip-update', tripUpdateRoutes);
router.use('/stack-holders', stackHoldersRoutes);
router.use('/goods', goodsRoutes);

module.exports = router;