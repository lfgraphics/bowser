const express = require('express');
const router = express.Router();

const allocateFuelingRoutes = require('./addFuelingAllocation');
const authRoutes = require('./auth');
const attatchedRoutes = require('./attatched');
const fuelingOrdersRoutes = require('./fuelingOrders');
const fuelingTransactionRouts = require('./addFuelingTransaction');
const listAllocations = require('./listAllocations');
const listDispensesRouts = require('./listDispenses');
const loadingOrder = require('./loading');
const notificationsRoutes = require('./notifications');
const petrolPump = require('./petrolPump');
const roleRoutes = require('./roles');
const searchBowserRoutes = require('./searchBowserDetails');
const searchDriverRoutes = require('./searchDriver');
const searchVehicleNumberRoutes = require('./searchVehicleNumber');
const test = require('./test');
const tripSheetRoutes = require('./tripSheet');
const updateRoutes = require('./updates');
const userRoutes = require('./users');
const bowserRoutes = require('./bowsers');

router.get('/', (req, res) => {
    res.send('landing page');
});

router.use('/addFuelingTransaction', fuelingTransactionRouts);
router.use('/allocateFueling', allocateFuelingRoutes);
router.use('/auth', authRoutes);
router.use('/attatched', attatchedRoutes);
router.use('/fuelingOrders', fuelingOrdersRoutes);
router.use('/listAllocations', listAllocations);
router.use('/listDispenses', listDispensesRouts);
router.use('/loading', loadingOrder);
router.use('/notifications', notificationsRoutes);
router.use('/petrol-pump', petrolPump);
router.use('/roles', roleRoutes);
router.use('/searchBowserDetails', searchBowserRoutes);
router.use('/searchDriver', searchDriverRoutes);
router.use('/searchVehicleNumber', searchVehicleNumberRoutes);
router.use('/test', test);
router.use('/tripSheet', tripSheetRoutes);
router.use('/users', userRoutes);
router.use('/bowsers', bowserRoutes);
router.use('/updates', updateRoutes);

module.exports = router;
