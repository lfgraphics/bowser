const express = require('express');
const router = express.Router();

const allocateFuelingRoutes = require('./addFuelingAllocation');
const authRoutes = require('./auth');
const attatchedRoutes = require('./attatched');
const bowserAdminAuth = require('./bowserAdminAuth');
const driverLogRoutes = require('./driversLog');
const tankerDriversAuth = require('./tanker-drivers');
const fuelingOrdersRoutes = require('./fuelingOrders');
const fuelStationRoutes = require('./fuelStation');
const fuelrequestRoutes = require('./fuelRequest');
const internalRoutes = require('./internal');
const fuelingTransactionRouts = require('./addFuelingTransaction');
const listAllocations = require('./listAllocations');
const listDispensesRouts = require('./listDispenses');
const loadingOrder = require('./loading');
const locationUpdateRoutes = require('./locationUpdate');
const morningUpdateRoutes = require('./morningUpdate');
const notificationsRoutes = require('./notifications');
const notificationUpdateRoutes = require('./notificationUpdate');
const petrolPump = require('./petrolPump');
const requestTransfer = require('./request-transfer');
const roleRoutes = require('./roles');
const reportRoutes = require('./report');
const saleryCalc = require('./salery-calc');
const searchBowserRoutes = require('./searchBowserDetails');
const searchDriverRoutes = require('./searchDriver');
const searchVehicleNumberRoutes = require('./searchVehicleNumber');
const test = require('./test');
const transAppRoutes = require('./transApp/index');
const tripSheetRoutes = require('./tripSheet');
const updateRoutes = require('./updates');
const userRoutes = require('./users');
const bowserRoutes = require('./bowsers');
const vehicleRoutes = require('./vehicle')
const vehicleDriverAuth = require('./vehicleDriversAuth')

router.get('/', (req, res) => {
    res.send('landing page');
});

router.post('/get-object-from-array', (req, res) => {
    const { headings, rows } = req.body;

    if (!Array.isArray(headings) || !Array.isArray(rows)) {
        return res.status(400).json({ error: 'Invalid input. Expected headings: string[], rows: string[]' });
    }

    const result = rows.map(row => {
        const values = row.split(',').map(val => val.trim());
        const obj = {};

        headings.forEach((key, index) => {
            obj[key] = values[index] || '';
        });

        return obj;
    });

    return res.json(result);
});

router.use('/addFuelingTransaction', fuelingTransactionRouts);
router.use('/allocateFueling', allocateFuelingRoutes);
router.use('/auth', authRoutes);
router.use('/attatched', attatchedRoutes);
router.use('/auth/admin', bowserAdminAuth);
router.use('/driver-log', driverLogRoutes);
router.use('/tanker-drivers', tankerDriversAuth);
router.use('/fuelingOrders', fuelingOrdersRoutes);
router.use('/fuel-station', fuelStationRoutes);
router.use('/fuel-request', fuelrequestRoutes);
router.use('/internal', internalRoutes);
router.use('/listAllocations', listAllocations);
router.use('/listDispenses', listDispensesRouts);
router.use('/loading', loadingOrder);
router.use('/location', locationUpdateRoutes);
router.use('/morning-update', morningUpdateRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/notification-update', notificationUpdateRoutes);
router.use('/petrol-pump', petrolPump);
router.use('/request-transfer', requestTransfer);
router.use('/roles', roleRoutes);
router.use('/trans-app', transAppRoutes);
router.use('/reports', reportRoutes);
router.use('/salery-calc', saleryCalc);
router.use('/searchBowserDetails', searchBowserRoutes);
router.use('/searchDriver', searchDriverRoutes);
router.use('/searchVehicleNumber', searchVehicleNumberRoutes);
router.use('/test', test);
router.use('/tripSheet', tripSheetRoutes);
router.use('/users', userRoutes);
router.use('/bowsers', bowserRoutes);
router.use('/updates', updateRoutes);
router.use('/vehicle', vehicleRoutes);
router.use('/auth/driver', vehicleDriverAuth);

module.exports = router;
