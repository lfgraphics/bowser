const express = require('express');
const router = express.Router();

const formSubmitRoutes = require('./formSubmit');
const searchDriverRoutes = require('./searchDriver');
const imageProcessingRoutes = require('./imageProcessing');
const authRoutes = require('./auth');
const fuelingOrdersRoutes = require('./fuelingOrders');
const allocateFuelingRoutes = require('./fuelingAllocation');
const searchVehicleNumberRoutes = require('./searchVehicleNumber');
const notificationsRoutes = require('./notifications');
const verifyFormDataRoutes = require('./verifyFormData');

router.get('/', (req, res) => {
    res.send('landing page');
});

router.use('/formsubmit', formSubmitRoutes);
router.use('/searchDriver', searchDriverRoutes);
router.use('/imageprocessing', imageProcessingRoutes);
router.use('/auth', authRoutes);
router.use('/fuelingOrders', fuelingOrdersRoutes);
router.use('/allocateFueling', allocateFuelingRoutes);
router.use('/searchVehicleNumber', searchVehicleNumberRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/verifyFormData', verifyFormDataRoutes);

module.exports = router;
