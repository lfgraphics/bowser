const express = require('express');
const router = express.Router();
const { FuelingTransaction } = require('../models/Transaction');
const { TripSheet } = require('../models/TripSheets');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { updateTripSheet, updateTripSheetBulk } = require('../utils/tripSheet')
const { mongoose } = require('mongoose');

router.get('/', async (req, res) => {
    const { tripSheetId, bowserNumber, startDate, endDate, driverName, page = 1, limit = 20, sortBy = 'fuelingDateTime', order = 'desc', verified, category, vehicleNo, allocator } = req.query;
    const skip = (page - 1) * limit;
    let filter = {};

    if (verified === 'true') {
        filter.dispenses.verified = true;
    } else if (verified === 'false') {
        filter.dispenses.verified = { $in: [false, null] };
    }

    if (bowserNumber) {
        filter['dispenses.bowser.regNo'] = bowserNumber;
    }

    if (allocator) {
        filter.$or = [
            { 'dispenses.allocationAdmin.name': { $regex: allocator, $options: "i" } },
            { 'dispenses.allocationAdmin.id': { $regex: allocator, $options: "i" } }
        ];
    }

    if (tripSheetId && tripSheetId !== null && tripSheetId !== undefined) {
        filter['tripSheetId'] = Number(tripSheetId);
    }

    if (driverName) {
        filter['dispenses.driverName'] = { $regex: driverName, $options: 'i' };
    }
    if (vehicleNo) {
        filter['dispenses.vehicleNumber'] = { $regex: vehicleNo, $options: 'i' };
    }

    if (startDate && endDate) {
        filter.dispenses.fuelingDateTime = {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        };
    }


    if (category !== undefined && category !== 'all') {
        filter['dispenses.category'] = category;
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    console.log("filter: ", filter)

    try {
        const records = await TripSheet.aggregate([
            { $match: filter },
            { $sort: { _id: -1 } },
            { $unwind: '$dispenses' },
            {
                $project: {
                    _id: 0,
                    'dispenses._id': 1,
                    'dispenses.vehicleNumber': 1,
                    'dispenses.tripSheetId': 1,
                    'dispenses.quantityType': 1,
                    'dispenses.fuelQuantity': 1,
                    'dispenses.driverName': 1,
                    'dispenses.driverMobile': 1,
                    'dispenses.bowser': 1,
                    'dispenses.fuelingDateTime': 1,
                    'dispenses.gpsLocation': 1,
                    'dispenses.verified': 1,
                    'dispenses.category': 1,
                    'dispenses.party': 1,
                    'dispenses.odometer': 1
                }
            },
            { $skip: skip },
            { $limit: Number(limit) },
            { $sort: { [sortBy]: sortOrder } },
        ]).sort({ '_id': -1 });

        const totalRecords = await TripSheet.aggregate([
            { $match: filter },
            {
                $project: {
                    dispenseCount: {
                        $cond: {
                            if: { $isArray: "$dispenses" },
                            then: { $size: { $ifNull: ["$dispenses", []] } },
                            else: 0
                        }
                    }
                }
            },
            { $group: { _id: null, total: { $sum: "$dispenseCount" } } }
        ]).then(result => (result[0]?.total || 0));

        console.log(records.length)

        if (records.length == 0) {
            res.status(400).json({ message: 'No records found' })
        } else {
            res.status(200).json({
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit),
                currentPage: Number(page),
                records,
            });
        }
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
    // Apply filters if provided
    if (bowserNumber) {
        filter['bowser.regNo'] = bowserNumber;
    }

    if (driverName) {
        filter['driverName'] = { $regex: driverName, $options: 'i' };
    }
    if (tripSheetId) {
        // Ensure tripSheetId is a number to prevent CastError
        const numericTripSheetId = Number(tripSheetId);
        if (!isNaN(numericTripSheetId)) {
            filter['tripSheetId'] = numericTripSheetId;
        } else {
            console.error('Invalid tripSheetId format. Expected a number.');
            return res.status(400).json({ message: 'Invalid tripSheetId format. Expected a number.' });
        }
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const recordLimit = limit ? parseInt(limit, 10) : undefined; // Convert limit to a number if provided

    try {
        // Fetch filtered, sorted, and limited records
        const records = await FuelingTransaction.find(filter, {
            fuelingDateTime: 1,
            tripSheetId: 1,
            bowser: 1,
            gpsLocation: 1,
            driverName: 1,
            driverMobile: 1,
            vehicleNumber: 1,
            fuelQuantity: 1,
            quantityType: 1,
            verified: 1
        }).sort({ [sortBy]: sortOrder }).limit(recordLimit);

        // Format records for Excel
        const formattedRecords = records.map(record => ({
            'Trip Sheet Number': record.tripSheetId,
            'Fueling Time': record.fuelingDateTime,
            'Fueling Location': record.gpsLocation,
            'Bowser Number': record.bowser.regNo,
            'Bowser Driver': record.bowser.driver.name,
            'Bowser Driver Ph No.': record.bowser.driver.phoneNo,
            'Vehicle Number': record.vehicleNumber,
            'Vehicle Driver Name': record.driverName,
            'Vehicle Driver Mobile': record.driverMobile,
            'Fuel Quantity': `${record.quantityType}, ${record.fuelQuantity} Liter`,
        }));

        // Generate a dynamic file name based on filters and record length
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filterDescription = `${bowserNumber ? `Bowser-${bowserNumber}_` : ''}${driverName ? `Driver-${driverName}_` : ''}`;
        const fileName = `dispenses_data_${filterDescription}Count-${formattedRecords.length}_${timestamp}.xlsx`;

        // Create and write the Excel file
        const worksheet = XLSX.utils.json_to_sheet(formattedRecords);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dispenses Data');

        const filePath = path.join(__dirname, fileName);
        XLSX.writeFile(workbook, filePath);

        // Send the file to the client for download

        res.download(filePath, fileName, err => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ message: 'Error downloading file' });
            }

            // Delete the file after sending to clean up
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
        });

        if (!updatedRecord) {
            return res.status(404).json({ heading: "Failed", message: 'Record not found' });
        }

        await updateTripSheet({ tripSheetId: updatedRecord.tripSheetId, newDispense: updateData })

        res.status(200).json({ heading: "Success!", message: 'Record updated successfully', updatedRecord });
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ heading: "Failed!", message: 'Internal server error' });
    }
});
router.patch('/verify/:id', async (req, res) => {
    console.log(req.body)
    const { id } = req.params;
    let { by, tripSheetId } = req.body
    try {
        const verified = {
            id,
            status: true,
            by: {
                id: by.id,
                name: by.name
            }
        }
        const transaction = await FuelingTransaction.findByIdAndUpdate(new mongoose.Types.ObjectId(id), { verified }, {
            new: true,
            runValidators: true,
        });

        if (!transaction) {
            return res.status(404).json({ heading: "Failed", message: 'Record not found' });
        }

        await updateTripSheet({ tripSheetId, verify: verified })

        if (!transaction) {
            return res.status(404).json({ heading: "Failed", message: 'Record not found' });
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
        let verified = {
            status: true,
            by: {
                id: by.id,
                name: by.name
            }
        }
        const result = await FuelingTransaction.updateMany(
            { _id: { $in: ids } },
            {
                $set: { verified }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ heading: "Failed!", message: "No records found to update" });
        }

        const transactions = await FuelingTransaction.find({ _id: { $in: ids } });
        const verification = transactions.map((transaction) => ({
            tripSheetId: transaction.tripSheetId,
            verify: {
                id: transaction._id,
                verified: verified
            }
        }));

        const tripSheetResult = await updateTripSheetBulk({ verification });

        if (!tripSheetResult.success) {
            return res.status(500).json({
                heading: "Failed!",
                message: "Error updating TripSheets",
                details: tripSheetResult.message
            });
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
    const { tripSheetId, id } = req.body
    console.log(req.body)
    try {
        const deletedRecord = await FuelingTransaction.findByIdAndDelete(id);

        if (!deletedRecord) {
            return res.status(404).json({ message: 'Record not found' });
        }

        await updateTripSheet({ tripSheetId, removeDispenseId: id })

        res.status(200).json({ message: 'Fueling record deleted successfully', success: true });
    } catch (err) {
        console.error('Error deleting Fueling record:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
})

module.exports = router;
