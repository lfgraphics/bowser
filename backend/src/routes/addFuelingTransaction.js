const express = require('express');
const router = express.Router();
const { FuelingTransaction } = require('../models/Transaction');
const FuelingOrder = require('../models/fuelingOrders');
const FuelRequest = require('../models/FuelRequest');
const { fetchLocationData } = require('../utils/fuelTransactions');
const { updateTripSheet, updateTripSheetBulk } = require('../utils/tripSheet')
const { sendWebPushNotification } = require('../utils/pushNotifications');
const { mongoose } = require('mongoose');

router.post('/', async (req, res) => {
    const { tripSheetId } = req.body;
    try {
        let fuelingTransaction = new FuelingTransaction(req.body);

        if (!fuelingTransaction.gpsLocation || fuelingTransaction.gpsLocation.length == 0) {
            return res.status(502).json({ message: 'GPS location not found\nPlease try again' })
        }

        let cordinates = fuelingTransaction.gpsLocation?.split(',')

        let location = await fetchLocationData(cordinates[0], cordinates[1]);

        fuelingTransaction.gpsLocation = location

        const saveOptions = {
            writeConcern: {
                w: 'majority',
                wtimeout: 30000
            }
        };

        const savePromise = fuelingTransaction.save(saveOptions);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Save operation timed out')), 35000)
        );

        await Promise.race([savePromise, timeoutPromise]);

        const transactionWithoutImages = fuelingTransaction.toObject();
        delete transactionWithoutImages.fuelMeterImage;
        delete transactionWithoutImages.vehicleNumberPlateImage;

        console.log('created fuel transaction: ', transactionWithoutImages)

        let tripUpdate = await updateTripSheet({ tripSheetId: fuelingTransaction.tripSheetId, newDispense: fuelingTransaction })
        if (tripUpdate.success) {
            res.status(200).json({ message: 'Data Submitted successfully' });
        } else {
            console.error(tripUpdate.error);
            res.status(500).json({ message: 'Failed to submit data', error: tripUpdate.error });
        }

        const fuelingOrder = !fuelingTransaction.orderId ? null : await FuelingOrder.findById(new mongoose.Types.ObjectId(fuelingTransaction.orderId))

        if (fuelingOrder && fuelingOrder !== null) {
            fuelingOrder.fulfilled = true;
            await fuelingOrder.save();
        }

        let primaryHead = fuelingTransaction.category == "Bulk Sale" ? `Party: ${fuelingTransaction.party}` : `Vehicle Number: ${fuelingTransaction.vehicleNumber}`;
        let midHead = fuelingTransaction.category == "Attatch" ? `Vendor: ${fuelingTransaction.party}\n` : ``;
        let secondaryHead = fuelingTransaction.category == "Bulk Sale" ? `` : `Driver: ${fuelingTransaction.driverName}\n`;
        let headEnd = `was done by: ${fuelingTransaction.bowser.driver.name}\nLocation: ${location} at: ${fuelingTransaction.fuelingDateTime}`;
        let userId = fuelingTransaction.allocationAdmin.id;
        let message = `Order to:\n${primaryHead}\n${midHead}${secondaryHead}${headEnd}`
        let options = {
            title: "Your Order has been fulfilled successfully",
            data: { url: `/dispense-records/${fuelingTransaction._id.toString()}` }
        };
        if (userId.length > 2) await sendWebPushNotification({ userId, message, options })

    } catch (err) {
        console.error('Error saving fueling record data:', err);

        if (err.message === 'Save operation timed out') {
            res.status(503).json({
                message: 'The database operation timed out. Please try again later.',
                error: 'Database timeout'
            });
        } else if (err.name === 'MongooseError' && err.message.includes('buffering timed out')) {
            res.status(503).json({
                message: 'The database is currently unavailable. Please try again later.',
                error: 'Database connection timeout'
            });
        } else {
            res.status(500).json({
                message: 'An error occurred while saving the fuleing transaction data. Please try again',
                error: err.message
            });
        }
    }
});

router.put('/update-from-driver/:id', async (req, res) => {
    const { id } = req.params;
    const { odometer, fuelQuantity, allocationType, orderId, tripId } = req.body;
    const fuelRequest = await FuelRequest.findById(id).populate('allocation');
    const allocation = fuelRequest.allocation;
    if (!fuelRequest) {
        return res.status(404).json({ message: 'Fuel request not found' });
    }
    let fuelingTransaction = new FuelingTransaction({
        orderId: allocation._id,
        trip: tripId,
        category: allocation.category,
        party: allocation.party,
        odometer: odometer,
        vehicleNumber: fuelRequest.vehicleNumber,
        driverId: fuelRequest.driverId,
        driverName: fuelRequest.driverName,
        driverMobile: fuelRequest.driverMobile,
        quantityType: allocation.quantityType,
        fuelQuantity: fuelQuantity,
        location: allocation.pumpLocation || allocation.fuelProvider,
        fuelingDateTime: new Date(),
        verified: {
            status: true,
        },
        allocationType: allocationType || 'Fuel Request',
        orderId: orderId,

        allocationAdmin: allocation.allocationAdmin,
    });

    const fuelingOrder = await FuelingOrder.findById(orderId);

    if (fuelingOrder && fuelingOrder !== null) {
        fuelingOrder.fuelQuantity = fuelQuantity;
        fuelingOrder.fulfilled = true;
        await fuelingOrder.save();
    }
    await fuelingTransaction.save()
    res.status(200).json({ message: 'Fueling transaction created successfully', fuelingTransaction });

});

router.post('/bulk', async (req, res) => {
    try {
        const fuelingTransactions = req.body;
        const tripSheetId = fuelingTransactions[0].tripSheetId;

        const saveOptions = {
            writeConcern: {
                w: 'majority',
                wtimeout: 30000
            }
        };

        const savePromises = fuelingTransactions.map(transactionData => {
            let fuelingTransaction = new FuelingTransaction(transactionData);
            return fuelingTransaction.save(saveOptions);
        });

        await Promise.all(savePromises);

        // let tripUpdate = 
        await updateTripSheetBulk({ tripSheetId, dispenses: fuelingTransactions })
        // if (tripUpdate.success) { } else {}
        res.status(200).json({ message: 'Bulk Data Submitted successfully' });

    } catch (err) {
        console.error('Error saving fueling record data:', err);

        if (err.message === 'Save operation timed out') {
            res.status(503).json({
                message: 'The database operation timed out. Please try again later.',
                error: 'Database timeout'
            });
        } else if (err.name === 'MongooseError' && err.message.includes('buffering timed out')) {
            res.status(503).json({
                message: 'The database is currently unavailable. Please try again later.',
                error: 'Database connection timeout'
            });
        } else {
            res.status(500).json({
                message: 'An error occurred while saving the fuleing transaction data. Please try again',
                error: err.message
            });
        }
    }
});

module.exports = router;