const express = require('express');
const router = express.Router();
const FuelingTransaction = require('../models/fuelingTransaction');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

router.get('/', async (req, res) => {
    const { tripSheetId, bowserNumber, startDate, endDate, driverName, page = 1, limit = 20, sortBy = 'fuelingDateTime', order = 'desc', verified, category } = req.query;
    const skip = (page - 1) * limit;
    let filter = {};

    if (verified === 'true') {
        filter.verified = true;
    } else if (verified === 'false') {
        filter.verified = { $in: [false, null] };
    }

    if (bowserNumber) {
        filter['bowser.regNo'] = bowserNumber;
    }
    if (tripSheetId) {
        filter['tripSheetId'] = { $regex: tripSheetId, $options: 'i' };
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


    if (category !== 'all') {
        console.log(category)
        filter['category'] = category;
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    console.log(filter)

    try {
        const records = await FuelingTransaction.find(filter, {
            vehicleNumber: 1,
            tripSheetId: 1,
            quantityType: 1,
            fuelQuantity: 1,
            driverName: 1,
            driverMobile: 1,
            bowser: 1,
            fuelingDateTime: 1,
            gpsLocation: 1,
            verified: 1,
            category: 1
        }).skip(skip).limit(Number(limit)).sort({ [sortBy]: sortOrder });
        const totalRecords = await FuelingTransaction.countDocuments();

        if (records.length == 0) {
            res.status(400).json({ message: 'No records found' })
        } else {
            res.json({
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
        filter['tripSheetId'] = { $regex: tripSheetId, $options: 'i' };
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

        res.json({ heading: "Success!", message: 'Record updated successfully', updatedRecord }); // Send the updated record and a success message back to the client
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ heading: "Failed!", message: 'Internal server error' });
    }
});

module.exports = router;
