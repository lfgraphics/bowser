const express = require('express');
const router = express.Router();

const loginRoutes = require('./login');
const vehiclesRoutes = require('./fetch-vehicles');

router.use('/login', loginRoutes);
router.use('/vehicles', vehiclesRoutes);

module.exports = router;