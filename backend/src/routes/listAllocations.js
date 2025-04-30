const express = require('express');
const router = express.Router();
const FuelingOrder = require('../models/fuelingOrders');

router.get('/', async (req, res) => {
    const { tripSheetId, bowserNumber, startDate, endDate, driverName, page = 1, limit = 20, sortBy = 'createdAt', order = 'asc', verified, category, vehicleNo, allocator } = req.query;
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

    if (allocator && allocator !== null && allocator !== undefined && allocator !== ' ') {
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
        const records = await FuelingOrder.find(filter).skip(skip).limit(Number(limit)).sort({ [sortBy]: sortOrder });
        const totalRecords = await FuelingOrder.countDocuments(filter);

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
        console.error('Error fetching Allocation records:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to export Allocation records to Excel
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
        const records = await FuelingOrder.find(filter, {
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
        const singleRecord = await FuelingOrder.findById(id);

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
        const updatedRecord = await FuelingOrder.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!updatedRecord) {
            return res.status(404).json({ heading: "Failed", message: 'Record not found' });
        }

        res.status(200).json({ heading: "Success!", message: 'Record updated successfully', updatedRecord }); // Send the updated record and a success message back to the client
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ heading: "Failed!", message: 'Internal server error' });
    }
});

router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params
    try {
        const deletedRecord = await FuelingOrder.findByIdAndDelete(id);

        if (!deletedRecord) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.status(200).json({ message: 'Allocation record deleted successfully', success: true });
    } catch (err) {
        console.error('Error deleting Allocation record:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
})

module.exports = router;
