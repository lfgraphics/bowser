const express = require('express');
const router = express.Router();
const { FuelingTransaction } = require('../models/Transaction');
const { TripSheet } = require('../models/TripSheets')
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { updateTripSheet } = require('../utils/tripSheet')
const { mongoose } = require('mongoose');

router.get('/', async (req, res) => {
    const { tripSheetId, bowserNumber, startDate, endDate, driverName, page = 1, limit = 20, sortBy = 'fuelingDateTime', order = 'desc', verified, category, vehicleNo, allocator } = req.query;
    const skip = (page - 1) * limit;
    let filter = {};

    filter.tripSheetId = { $exists: true };

    if (verified === 'true') {
        filter.verified = true;
    } else if (verified === 'false') {
        filter.verified = { $in: [false, null] };
    }

    if (bowserNumber) {
        filter['bowser.regNo'] = bowserNumber;
    }

    if (allocator) {
        filter.$or = [
            { 'allocationAdmin.name': { $regex: allocator, $options: "i" } },
            { 'allocationAdmin.id': { $regex: allocator, $options: "i" } }
        ];
    }

    if (tripSheetId && tripSheetId !== null && tripSheetId !== undefined) {
        filter['tripSheetId'] = Number(tripSheetId);
    }

    if (driverName) {
        filter['driverName'] = { $regex: driverName, $options: 'i' };
    }
    if (vehicleNo) {
        filter['vehicleNumber'] = { $regex: vehicleNo, $options: 'i' };
    }

    if (startDate && endDate) {
        filter.fuelingDateTime = {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        };
    }


    if (category !== undefined && category !== 'all') {
        filter['category'] = category;
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    try {
        const records = await FuelingTransaction.collection.aggregate([
            { $match: filter },
            { $sort: { [sortBy]: sortOrder } },
            { $skip: skip },
            { $limit: Number(limit) },
            {
                $project: {
                    vehicleNumber: 1,
                    tripSheetId: 1,
                    quantityType: 1,
                    fuelQuantity: 1,
                    driverName: 1,
                    driverMobile: 1,
                    bowser: 1,
                    fuelingDateTime: 1,
                    location: 1,
                    verified: 1,
                    category: 1,
                    party: 1,
                    odometer: 1,
                    posted: 1
                }
            }
        ], { allowDiskUse: true }).toArray();

        const totalRecords = await FuelingTransaction.countDocuments(filter);

        res.json({
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            currentPage: Number(page),
            records, // can be empty []
        });
    } catch (error) {
        console.error('Error fetching fueling records:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to export fueling records to Excel
router.get('/export/excel', async (req, res) => {
    const { bowserNumber, driverName, tripSheetId, sortBy = 'fuelingDateTime', order = 'desc', limit, verified } = req.query;
    let filter = {};

    if (verified === 'true') {
        filter.verified = true;
    } else if (verified === 'false') {
        filter.verified = { $in: [false, null] };
    }
    if (bowserNumber) {
        filter['bowser.regNo'] = bowserNumber;
    }

    if (driverName) {
        filter['driverName'] = { $regex: driverName, $options: 'i' };
    }
    if (tripSheetId) {
        const numericTripSheetId = Number(tripSheetId);
        if (!isNaN(numericTripSheetId)) {
            filter['tripSheetId'] = numericTripSheetId;
        } else {
            console.error('Invalid tripSheetId format. Expected a number.');
            return res.status(400).json({ message: 'Invalid tripSheetId format. Expected a number.' });
        }
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const recordLimit = limit ? parseInt(limit, 10) : undefined;

    try {
        const records = await FuelingTransaction.find(filter, {
            fuelingDateTime: 1,
            tripSheetId: 1,
            bowser: 1,
            gpsLocation: 1,
            location: 1,
            driverName: 1,
            driverMobile: 1,
            vehicleNumber: 1,
            fuelQuantity: 1,
            quantityType: 1,
            verified: 1
        }).sort({ [sortBy]: sortOrder }).limit(recordLimit);

        const formattedRecords = records.map(record => ({
            'Trip Sheet Number': record.tripSheetId,
            'Fueling Time': record.fuelingDateTime,
            'Fueling Location': record.location,
            'Bowser Number': record.bowser.regNo,
            'Bowser Driver': record.bowser.driver.name,
            'Bowser Driver Ph No.': record.bowser.driver.phoneNo,
            'Vehicle Number': record.vehicleNumber,
            'Vehicle Driver Name': record.driverName,
            'Vehicle Driver Mobile': record.driverMobile,
            'Fueling Type': record.quantityType,
            'Quantity': record.fuelQuantity,
            'Cordinates location': record.gpsLocation,
        }));

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filterDescription = `${bowserNumber ? `Bowser-${bowserNumber}_` : ''}${driverName ? `Driver-${driverName}_` : ''}`;
        const fileName = `dispenses_data_${filterDescription}Count-${formattedRecords.length}_${timestamp}.xlsx`;

        const worksheet = XLSX.utils.json_to_sheet(formattedRecords);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dispenses Data');

        const filePath = path.join(__dirname, fileName);
        XLSX.writeFile(workbook, filePath);

        res.download(filePath, fileName, err => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ message: 'Error downloading file', err });
            }

            fs.unlinkSync(filePath);
        });
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const singleRecord = await FuelingTransaction.findById(id);

        if (!singleRecord) {
            return res.status(404).json({ message: 'Record not found' });
        }
        res.json(singleRecord);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.patch('/update/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const updatedRecord = await FuelingTransaction.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }, { new: true });

        if (!updatedRecord) {
            return res.status(404).json({ heading: "Failed", message: 'Record not found' });
        }
        await updateTripSheet({ tripSheetId: updatedRecord.tripSheetId, newDispense: updatedRecord })

        res.status(200).json({ heading: "Success!", message: 'Record updated successfully', updatedRecord });
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ heading: "Failed!", message: 'Internal server error' });
    }
});
router.patch('/verify/:id', async (req, res) => {
    const { id } = req.params;
    let { by } = req.body
    console.log('Verifying record with ID:', id, 'requested by: ', by);
    try {
        const transaction = await FuelingTransaction.findByIdAndUpdate(new mongoose.Types.ObjectId(id), {
            verified: {
                status: true,
                by: {
                    id: by.id,
                    name: by.name
                }
            }
        }, { new: true });
        let tripUpdate;
        if (transaction) {
            tripUpdate = await updateTripSheet({ tripSheetId: transaction.tripSheetId, verify: transaction })
        }

        console.log('Trip update result:', tripUpdate);

        if (!transaction || !tripUpdate.success) {
            await FuelingTransaction.findByIdAndUpdate(id, {
                $unset: { verified: "" }
            })
            return res.status(404).json({ heading: "Failed", message: 'Record not found' });
        }

        res.status(200).json({ heading: "Success!", message: 'Record verified successfully' });
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ heading: "Failed!", message: 'Internal server error' });
    }
});
router.patch('/post/:id', async (req, res) => {
    const { id } = req.params;
    let { by } = req.body
    console.log('Posting record with ID:', id, 'requested by: ', by);
    try {
        const transaction = await FuelingTransaction.findByIdAndUpdate(id, {
            posted: {
                status: true,
                by: {
                    id: by.id,
                    name: by.name
                }
            }
        }, { new: true });

        if (!transaction) {
            return res.status(404).json({ heading: "Failed", message: 'Record not found' });
        }

        if (transaction) {
            await updateTripSheet({ tripSheetId: transaction.tripSheetId, post: transaction })
        }

        res.status(200).json({ heading: "Success!", message: 'Record verified successfully' });
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ heading: "Failed!", message: 'Internal server error' });
    }
});
router.post('/verify', async (req, res) => {
    const { ids, by } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ heading: "Failed!", message: "Invalid or empty ids array" });
    }
    try {
        const result = await FuelingTransaction.updateMany(
            { _id: { $in: ids } },
            {
                $set: {
                    verified: {
                        status: true,
                        by: {
                            id: by.id,
                            name: by.name
                        }
                    }
                }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ heading: "Failed!", message: "No records found to update" });
        }

        const transactions = await FuelingTransaction.find({ _id: { $in: ids } });
        for (let i = 0; i < transactions.length; i++) {
            await updateTripSheet({ tripSheetId: transactions[i].tripSheetId, newDispense: transactions[i] });
        }

        res.json({
            heading: "Success!",
            message: `${result.modifiedCount} record(s) verified successfully`,
            result
        });
    } catch (error) {
        console.error('Error updating records:', error);
        res.status(500).json({ heading: "Failed!", message: 'Internal server error' });
    }
});

router.delete('/delete', async (req, res) => {
    const { tripSheetId, id, by } = req.body
    console.log('Deleting record with ID:', id, 'requested by: ', by);
    try {
        const deletedRecord = await FuelingTransaction.findByIdAndDelete(id);

        if (!deletedRecord) {
            return res.status(404).json({ message: 'Record not found' });
        }
        const removeDispenseId = id

        await updateTripSheet({ tripSheetId, removeDispenseId })

        res.status(200).json({ message: 'Fueling record deleted successfully', success: true });
    } catch (err) {
        console.error('Error deleting Fueling record:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
})

router.post('/transfer', async (req, res) => {
    const { toTripSheetId, transactionId } = req.body;

    if (!toTripSheetId || !transactionId) {
        return res.status(400).json({ message: "Both 'toTripSheetId' and 'transactionId' are required." });
    }

    try {
        // Fetch the transaction by its ID
        const transaction = await FuelingTransaction.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found." });
        }

        // Get the current tripSheetId (transfer from)
        const fromTripSheetId = transaction.tripSheetId;

        if (!fromTripSheetId) {
            return res.status(400).json({ message: "Transaction is not associated with any trip sheet." });
        }

        // Update the transaction's tripSheetId to the new one
        transaction.tripSheetId = toTripSheetId;
        await transaction.save();

        // Update both the source and destination trip sheets
        const fromUpdateResult = await updateTripSheet({ tripSheetId: fromTripSheetId, removeDispenseId: transactionId });
        const toUpdateResult = await updateTripSheet({ tripSheetId: toTripSheetId, newDispense: transaction });

        if (!fromUpdateResult.success || !toUpdateResult.success) {
            return res.status(500).json({
                message: "Failed to update one or both trip sheets.",
                fromUpdateResult,
                toUpdateResult,
            });
        }

        res.status(200).json({
            message: "Transaction transferred successfully.",
            fromTripSheetId,
            toTripSheetId,
            transaction,
        });
    } catch (error) {
        console.error("Error transferring transaction:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});

router.post('/sync-id', async (req, res) => {
    const { tripSheetId } = req.query
    const allTransactions = await FuelingTransaction.find({ tripSheetId: tripSheetId })
    const tripSheet = await TripSheet.findOne({ tripSheetId })
    if (!tripSheet) {
        return res.status(404).json({ message: 'Trip sheet not found' });
    }
    if (!allTransactions || allTransactions.length === 0) {
        return res.status(404).json({ message: 'No transactions found for this trip sheet' });
    }
    try {
        const updatedDispenses = [];

        for (const transaction of allTransactions) {
            const matchingDispense = tripSheet.dispenses.find(dispense =>
                dispense.fuelingDateTime.getTime() === transaction.fuelingDateTime.getTime() &&
                dispense.fuelQuantity === transaction.fuelQuantity &&
                dispense.vehicleNumber === transaction.vehicleNumber
            );

            if (matchingDispense && matchingDispense._id.toString() !== transaction._id.toString()) {
                // Update the dispense _id in tripSheet to match transaction _id
                matchingDispense._id = transaction._id;
                updatedDispenses.push({
                    oldDispenseId: matchingDispense._id,
                    newDispenseId: transaction._id
                });
            }
        }

        if (updatedDispenses.length > 0) {
            await tripSheet.save(); // Save the updated tripSheet
        }

        return res.status(200).json({
            message: 'TripSheet dispenses synced successfully',
            updatedDispenses
        });
    } catch (error) {
        console.error('Error syncing dispenses:', error);
        return res.status(500).json({ message: 'Error syncing dispenses', error: error.message });
    }
});

router.post('/sync-verification', async (req, res) => {
    const { tripSheetId } = req.query
    const allTransactions = await FuelingTransaction.find({ tripSheetId: tripSheetId })
    const tripSheet = await TripSheet.findOne({ tripSheetId })
    if (!tripSheet) {
        return res.status(404).json({ message: 'Trip sheet not found' });
    }
    if (!allTransactions || allTransactions.length === 0) {
        return res.status(404).json({ message: 'No transactions found for this trip sheet' });
    }
    try {
        const updatedDispenses = [];

        for (const transaction of allTransactions) {
            const matchingDispense = tripSheet.dispenses.find(dispense =>
                dispense.fuelingDateTime.getTime() === transaction.fuelingDateTime.getTime() &&
                dispense.fuelQuantity === transaction.fuelQuantity &&
                dispense.vehicleNumber === transaction.vehicleNumber
            );

            if (matchingDispense && matchingDispense.verified !== transaction.verified) {
                // Update the dispense _id in tripSheet to match transaction _id
                matchingDispense.verified = transaction.verified;
                updatedDispenses.push({
                    'Updated dispense for': transaction._id,
                });
            }
        }

        if (updatedDispenses.length > 0) {
            await tripSheet.save(); // Save the updated tripSheet
        }

        return res.status(200).json({
            message: 'TripSheet dispenses synced successfully',
            updatedDispenses
        });
    } catch (error) {
        console.error('Error syncing dispenses:', error);
        return res.status(500).json({ message: 'Error syncing dispenses', error: error.message });
    }
});

router.post('/remove-extra', async (req, res) => {
    const { tripSheetId } = req.query
    const allTransactions = await FuelingTransaction.find({ tripSheetId: tripSheetId })
    const tripSheet = await TripSheet.findOne({ tripSheetId })
    if (!tripSheet) {
        return res.status(404).json({ message: 'Trip sheet not found' });
    }
    if (!allTransactions || allTransactions.length === 0) {
        return res.status(404).json({ message: 'No transactions found for this trip sheet' });
    }
    try {
        const removedDispenses = [];
        const remainingDispenses = [];

        // Filter out dispenses that don't have matching transactions
        // Create a map to track seen transaction IDs
        const seenIds = new Map();

        tripSheet.dispenses = tripSheet.dispenses.filter(dispense => {
            const dispenseId = dispense._id.toString();
            const matchingTransaction = allTransactions.find(transaction =>
                transaction._id.toString() === dispenseId
            );

            if (matchingTransaction) {
                // If we've already seen this ID, remove the duplicate
                if (seenIds.has(dispenseId)) {
                    removedDispenses.push(dispenseId);
                    return false;
                }

                // Mark this ID as seen and keep the dispense
                seenIds.set(dispenseId, true);
                remainingDispenses.push(dispenseId);
                return true;
            } else {
                removedDispenses.push(dispenseId);
                return false;
            }
        });

        await tripSheet.save();

        return res.status(200).json({
            message: 'Extra dispenses removed successfully',
            removedCount: removedDispenses.length,
            remainingCount: remainingDispenses.length,
        });
    } catch (error) {
        console.error('Error removing extra dispenses:', error);
        return res.status(500).json({ message: 'Error removing extra dispenses', error: error.message });
    }
});

router.post('/recalculate-cost', async (req, res) => {
    const { tripSheetId } = req.query
    const tripSheet = await TripSheet.findOne({ tripSheetId })
    let dispenses = tripSheet.dispenses

    if (!tripSheet) {
        return res.status(404).json({ message: 'Trip sheet not found' });
    }

    try {
        for (let dispense of dispenses) {
            dispense.cost = (dispense.fuelQuantity * tripSheet.hsdRate).toFixed(2)
        }

        tripSheet.dispenses = dispenses

        await tripSheet.save();

        return res.status(200).json({
            message: 'Costs updated successfully', dispenses: tripSheet.dispenses
        });
    } catch (error) {
        console.error('Error removing extra dispenses:', error);
        return res.status(500).json({ message: 'Error removing extra dispenses', error: error.message });
    }
});

router.post('/refresh-post-status', async (req, res) => {
    const { tripSheetId } = req.query
    const allTransactions = await FuelingTransaction.find({ tripSheetId: tripSheetId })
    const tripSheet = await TripSheet.findOne({ tripSheetId })
    if (!tripSheet) {
        return res.status(404).json({ message: 'Trip sheet not found' });
    }
    if (!allTransactions || allTransactions.length === 0) {
        return res.status(404).json({ message: 'No transactions found for this trip sheet' });
    }
    try {
        const updatedDispenses = [];

        for (const transaction of allTransactions) {
            const matchingDispense = tripSheet.dispenses.find(dispense => dispense._id.toString() === transaction._id.toString());
            if (matchingDispense) {
                matchingDispense.posted = transaction.posted;
                updatedDispenses.push({
                    'Updated dispense for': transaction._id,
                });
            }
        }

        if (updatedDispenses.length > 0) {
            await tripSheet.save();
        }

        return res.status(200).json({
            message: 'TripSheet dispenses synced successfully',
            updatedDispenses
        });
    } catch (error) {
        console.error('Error syncing dispenses:', error);
        return res.status(500).json({ message: 'Error syncing dispenses', error: error.message });
    }
});

module.exports = router;
