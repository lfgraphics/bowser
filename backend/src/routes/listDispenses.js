const express = require('express');
const router = express.Router();
const FuelingTransaction = require('../models/fuelingTransaction');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Route to get filtered, paginated, and sorted fueling records
router.get('/', async (req, res) => {
    const { bowserNumber, startDate, endDate, driverName, page = 1, limit = 20, sortBy = 'fuelingDateTime', order = 'desc' } = req.query;
    const skip = (page - 1) * limit;
    let filter = { verified: { $ne: true } };

    if (bowserNumber) {
        filter['bowser.regNo'] = bowserNumber;
    }

    if (driverName) {
        filter['driverName'] = { $regex: driverName, $options: 'i' };
    }

    if (startDate && endDate) {
        filter.fuelingDateTime = {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        };
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    try {
        const records = await FuelingTransaction.find(filter, {
            vehicleNumber: 1,
            fuelQuantity: 1,
            driverName: 1,
            driverMobile: 1,
            bowser: 1,
            fuelingDateTime: 1,
            gpsLocation: 1,
        })
            .skip(skip)
            .limit(Number(limit))
            .sort({ [sortBy]: sortOrder });

        const totalRecords = await FuelingTransaction.countDocuments(filter);
        res.json({
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            currentPage: Number(page),
            records,
        });
    } catch (error) {
        console.error('Error fetching fueling records:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to export fueling records to Excel
router.get('/export/excel', async (req, res) => {
    try {
        const records = await FuelingTransaction.find({ verified: { $ne: true } }, {
            fuelingDateTime: 1,
            bowser: 1,
            gpsLocation: 1,
            driverName: 1,
            driverMobile: 1,
            vehicleNumber: 1,
            fuelQuantity: 1,
        });

        const formattedRecords = records.map(record => ({
            'Fueling Time': record.fuelingDateTime,
            'Bowser Number': record.bowser.regNo,
            'Bowser Location': record.gpsLocation,
            'Driver Name': record.driverName,
            'Driver Mobile': record.driverMobile,
            'Vehicle Number': record.vehicleNumber,
            'Fuel Quantity': `${record.quantityType}, ${record.fuelQuantity} Liter`,
        }));

        const worksheet = XLSX.utils.json_to_sheet(formattedRecords);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dispenses Data');

        const filePath = path.join(__dirname, 'dispenses_data.xlsx');
        XLSX.writeFile(workbook, filePath);

        res.download(filePath, 'dispenses_data.xlsx', err => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ message: 'Error downloading file' });
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

module.exports = router;
