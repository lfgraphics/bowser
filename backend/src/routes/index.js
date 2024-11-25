const express = require('express');
const router = express.Router();

const fuelingTransactionRouts = require('./addFuelingTransaction');
const searchDriverRoutes = require('./searchDriver');
const imageProcessingRoutes = require('./imageProcessing');
const authRoutes = require('./auth');
const fuelingOrdersRoutes = require('./fuelingOrders');
const allocateFuelingRoutes = require('./addFuelingAllocation');
const searchVehicleNumberRoutes = require('./searchVehicleNumber');
const notificationsRoutes = require('./notifications');
const listDispensesRouts = require('./listDispenses');
const searchBowserRoutes = require('./searchBowserDetails');
const tripSheetRoutes = require('./tripSheet');
const userRoutes = require('./users');
const roleRoutes = require('./roles');
<<<<<<< HEAD
const bowserRoutes = require('./bowsers');
=======
>>>>>>> dc70fc9f7b0e015cf8cd49bca9c0542f3ba056b8

router.get('/', (req, res) => {
    res.send('landing page');
});

router.use('/addFuelingTransaction', fuelingTransactionRouts);
router.use('/searchDriver', searchDriverRoutes);
router.use('/imageprocessing', imageProcessingRoutes);
router.use('/auth', authRoutes);
router.use('/fuelingOrders', fuelingOrdersRoutes);
router.use('/allocateFueling', allocateFuelingRoutes);
router.use('/searchVehicleNumber', searchVehicleNumberRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/listDispenses', listDispensesRouts);
router.use('/searchBowserDetails', searchBowserRoutes);
router.use('/tripSheet', tripSheetRoutes);
router.use('/users', userRoutes)
router.use('/roles', roleRoutes)
<<<<<<< HEAD
router.use('/bowsers', bowserRoutes)
=======
>>>>>>> dc70fc9f7b0e015cf8cd49bca9c0542f3ba056b8

module.exports = router;