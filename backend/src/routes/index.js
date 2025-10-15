import { Router } from 'express';
const router = Router();

import allocateFuelingRoutes from './addFuelingAllocation.js';
import authRoutes from './auth.js';
import attatchedRoutes from './attatched.js';
import bowserAdminAuth from './bowserAdminAuth.js';
import driverLogRoutes from './driversLog.js';
import tankerDriversAuth from './tanker-drivers.js';
import fuelingOrdersRoutes from './fuelingOrders.js';
import fuelStationRoutes from './fuelStation.js';
import fuelrequestRoutes from './fuelRequest.js';
import internalRoutes from './internal.js';
import fuelingTransactionRouts from './addFuelingTransaction.js';
import listAllocations from './listAllocations.js';
import listDispensesRouts from './listDispenses.js';
import loadingOrder from './loading.js';
// import locationUpdateRoutes from './locationUpdate.js';
import morningUpdateRoutes from './morningUpdate.js';
import notificationsRoutes from './notifications.js';
import notificationUpdateRoutes from './notificationUpdate.js';
import petrolPump from './petrolPump.js';
import requestTransfer from './request-transfer.js';
import roleRoutes from './roles.js';
import reportRoutes from './report.js';
import saleryCalc from './salery-calc.js';
import searchBowserRoutes from './searchBowserDetails.js';
import searchDriverRoutes from './searchDriver.js';
import searchVehicleNumberRoutes from './searchVehicleNumber.js';
import test from './test.js';
import transAppRoutes from './transApp/index.js';
import tripSheetRoutes from './tripSheet.js';
import updateRoutes from './updates.js';
import userRoutes from './users.js';
import bowserRoutes from './bowsers.js';
import vehicleRoutes from './vehicle.js';
import vehicleDriverAuth from './vehicleDriversAuth.js';
import campRouts from './camp/index.js';

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
// router.use('/location', locationUpdateRoutes);
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
router.use('/camp', campRouts);

export default router;
