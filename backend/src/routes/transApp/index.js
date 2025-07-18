const express = require('express');
const router = express.Router();

const loginRoutes = require('./login');
const vehiclesRoutes = require('./fetch-vehicles');
const tripUpdateRoutes = require('./update-in-trip');
const stackHoldersRoutes = require('./stack-holders');

router.use('/login', loginRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/trip-update', tripUpdateRoutes);
router.use('/stack-holders', stackHoldersRoutes);

module.exports = router;