const express = require('express');
const router = express.Router();

const fuelingTransactionRouts = require('./addFuelingTransaction');
const searchDriverRoutes = require('./searchDriver');
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
const bowserRoutes = require('./bowsers');
const updateRoutes = require('./updates');
const attatchedRoutes = require('./attatched');

router.get('/', (req, res) => {
    res.send('landing page');
});

router.use('/addFuelingTransaction', fuelingTransactionRouts);
router.use('/searchDriver', searchDriverRoutes);
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
router.use('/bowsers', bowserRoutes)
router.use('/updates', updateRoutes)
router.use('/attatched', attatchedRoutes)

module.exports = router;
