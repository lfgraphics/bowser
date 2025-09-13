const express = require('express');
const router = express.Router();
const { TripSheet } = require('../models/TripSheets');

router.get('/', async (req, res) => {
    const {
        searchParam,
        settlment,
        page = 1,
        limit = 60,
        sortField = 'tripSheetId',
        sortOrder = 'desc'
    } = req.query;

    const filter = { "settelment.details": { $exists: true }, "loading.sheetId": { $exists: true } };
    if (searchParam) {
        filter.$or = [
            { 'bowser.regNo': { $regex: searchParam, $options: 'i' } },
            { 'bowser.driver.name': { $regex: searchParam, $options: 'i' } },
            { tripSheetId: Number(searchParam) },
            { fuelingAreaDestination: { $regex: searchParam, $options: 'i' } }
        ];
    }
    if (settlment === 'true') {
        filter['$or'] = [
            { 'settelment.settled': false },
            { 'settelment.settled': { $exists: false } }
        ];
    }

    try {
        const tripSheets = await TripSheet.aggregate([
            { $match: filter },

            {
                $lookup: {
                    from: "BowserLoadingSheets", // ✅ exact collection name
                    localField: "loading.sheetId",
                    foreignField: "_id",
                    as: "loadingSheet",
                    pipeline: [
                        {
                            $project: {
                                pumpReadingAfter: 1,
                                odoMeter: 1,
                                totalLoadQuantityBySlip: 1,
                                totalLoadQuantityByDip: 1
                            }
                        }
                    ]
                }
            },
            { $unwind: { path: "$loadingSheet", preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    createdAt: 1,
                    totalAdditionQty: 1,
                    balanceQty: 1,
                    tripSheetId: 1,
                    fuelingAreaDestination: 1,
                    tripSheetGenerationDateTime: 1,
                    "settelment.details.pumpReading": 1,
                    "settelment.details.odometer": 1,
                    totalLoadQuantity: 1,
                    totalLoadQuantityBySlip: 1,
                    saleQty: 1,
                    balanceQtyBySlip: 1,
                    "bowser.driver.name": 1,
                    "bowser.regNo": 1,
                    closure: 1,

                    // flatten from loadingSheet
                    pumpReadingBefore: "$loadingSheet.pumpReadingAfter",
                    odometerBefore: "$loadingSheet.odoMeter",
                    totalLoadQuantityBySlipFromSheet: "$loadingSheet.totalLoadQuantityBySlip",
                    totalLoadQuantityByDipFromSheet: "$loadingSheet.totalLoadQuantityByDip"
                }
            },

            { $sort: { [sortField]: sortOrder === "asc" ? 1 : -1 } },
            { $skip: (page - 1) * limit },
            { $limit: Number(limit) }
        ]);

        res.status(200).json(tripSheets);
    } catch (err) {
        console.error('Error fetching TripSheets:', err);
        res.status(500).json({ message: 'Failed to fetch TripSheets', error: err.message });
    }
});


module.exports = router;