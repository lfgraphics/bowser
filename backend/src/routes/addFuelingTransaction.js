const express = require('express');
const router = express.Router();
const { FuelingTransaction } = require('../models/Transaction');
const FuelingOrder = require('../models/fuelingOrders');
const { fetchLocationData } = require('../utils/fuelTransactions');
const { updateTripSheet, updateTripSheetBulk } = require('../utils/tripSheet')
const { sendWebPushNotification } = require('../utils/pushNotifications');
const { mongoose } = require('mongoose');

router.post('/', async (req, res) => {
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

        console.log(fuelingTransaction)

        let tripSheetObject = {
            transaction: fuelingTransaction._id,
            fuelQuantity: fuelingTransaction.fuelQuantity,
            isVerified: false,
            isPosted: false,
        }

        let tripUpdate = await updateTripSheet({ tripSheetId: fuelingTransaction.tripSheetId, newDispense: fuelingTransaction })
        if (tripUpdate.success) {
            res.status(200).json({ message: 'Data Submitted successfully' });
        } else {
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
            title: "Your Order has bees successfully followed",
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

router.post('/bulk', async (req, res) => {
    try {
        const fuelingTransactions = req.body;

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

        const tripSheetUpdates = fuelingTransactions.map(transaction => ({
            tripSheetId: transaction.tripSheetId,
            newDispense: {
                transaction: transaction._id,
                fuelQuantity: transaction.fuelQuantity,
                isVerified: false,
                isPosted: false,
            }
        }));

        await updateTripSheetBulk(tripSheetUpdates);

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