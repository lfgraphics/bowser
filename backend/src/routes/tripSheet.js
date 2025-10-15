import { Router } from 'express';
const router = Router();
import { TripSheet } from '../models/TripSheets.js';
import { Types } from 'mongoose';
import { findOneAndUpdate as updateUser } from '../models/user.js';
import { findOne as findOneBowser, findOneAndUpdate as updateBowser } from '../models/Bowsers.js';
import { findOneAndUpdate as updateLoadingSheet } from '../models/LoadingSheet.js';
import { calculateQty } from '../utils/calibration.js';
import { updateTripSheet } from '../utils/tripSheet.js';
import { sendNativePushNotification, sendBulkNotifications } from '../utils/pushNotifications.js';
import { withTransaction } from '../utils/transactions.js';
import { handleTransactionError, createErrorResponse } from '../utils/errorHandler.js';

const notifyDriver = async ({ phoneNumber, bowser, tripsheetId, location }) => {
    let options = {
        title: "नयी ट्रिप.."
    }
    let message = `आप को ${tripsheetId} ट्रिपशीट, और बाउज़र ${bowser} दिया गया है\nआप को ${location} जाना है`
    await sendNativePushNotification({ mobileNumber: phoneNumber, message, options })
}

const checkExistingTrip = async (regNo) => {
    const bowser = await findOneBowser({ regNo });
    if (bowser && bowser.currentTrip) {
        const currentTrip = await TripSheet.findById(bowser.currentTrip);
        if (currentTrip && !currentTrip.settelment?.settled) {
            const e = new Error(
                `This bowser is currently on an unsettled trip. Settle the existing trip (${currentTrip.tripSheetId}) before creating a new one.`
            );
            e.name = 'ValidationError';
            throw e;
        }
    }
};

const updateBowserDriver = async (phoneNo, regNo, session = null) => {
    if (!phoneNo) return;
    await updateUser(
        { phoneNumber: phoneNo },
        { $set: { bowserId: regNo } },
        { new: true, upsert: true, session }
    );

};

const updateBowserCurrentTrip = async (regNo, tripSheetId, session = null) => {
    const updatedBowser = await updateBowser(
        { regNo },
        { $set: { currentTrip: tripSheetId } },
        { new: true, session }
    );
    if (!updatedBowser) {
        console.warn(`No bowser found with regNo: ${regNo}`);
    }
};

router.post('/create', async (req, res) => {
    try {
        const { bowser, loading, fuelingAreaDestination, proposedDepartureTime, hsdRate } = req.body;

        // Pre-transaction validation
        if (!bowser?.regNo || !loading?.sheetId || !fuelingAreaDestination) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Missing required fields: bowser.regNo, loading.sheetId, fuelingAreaDestination' }));
        }
        const qtyDip = Number(loading.quantityByDip);
        const qtySlip = Number(loading.quantityBySlip);
        if (Number.isNaN(qtyDip) || Number.isNaN(qtySlip)) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid quantities: loading.quantityByDip and loading.quantityBySlip must be numbers' }));
        }

        // Check for existing unsettled trips (read-only, outside transaction)
        await checkExistingTrip(bowser.regNo);

        // Execute multi-connection transaction
        const newSheet = await withTransaction(async (sessions) => {
            const sheet = new TripSheet({
                bowser,
                hsdRate,
                loading: {
                    sheetId: new Types.ObjectId(loading.sheetId),
                    quantityByDip: qtyDip,
                    quantityBySlip: qtySlip,
                    tempLoadByDip: loading.tempLoadByDip,
                },
                fuelingAreaDestination,
                proposedDepartureTime,
            });

            await sheet.save({ session: sessions.bowsers });

            // Update bowser driver information in users DB
            const phoneNo = bowser.driver?.[0]?.phoneNo;
            await updateBowserDriver(phoneNo, bowser.regNo, sessions.users);

            // Update Bowser with the current trip in bowsers DB
            await updateBowserCurrentTrip(bowser.regNo, sheet._id, sessions.bowsers);

            // Mark loading sheet fulfilled in bowsers DB
            await updateLoadingSheet(
                { _id: loading.sheetId },
                { $set: { fulfilled: true } },
                { new: true, session: sessions.bowsers }
            );

            return sheet;
        }, { connections: ['bowsers', 'users'], context: { route: '/create', bowserRegNo: bowser.regNo } });

        // Respond on success (after commit)
        res.status(201).json({ message: 'Trip Sheet created successfully', tripSheet: newSheet });

        // Notifications: outside transaction; do not affect response
        try {
            await notifyDriver({ phoneNumber: newSheet.bowser.driver[0]?.phoneNo, bowser: newSheet.bowser.regNo, tripsheetId: newSheet.tripSheetId, location: newSheet.fuelingAreaDestination });
        } catch (notifyErr) {
            console.error('Notification error (driver):', notifyErr?.message || notifyErr);
        }
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/create', bowserRegNo: req?.body?.bowser?.regNo });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.get('/all', async (req, res) => {
    const {
        searchParam,
        settlment,
        page = 1,
        limit = 20,
        sortField = 'tripSheetId',
        sortOrder = 'desc'
    } = req.query;

    const filter = {};
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
                $project: {
                    createdAt: 1,
                    totalAdditionQty: 1,
                    balanceQty: 1,
                    tripSheetId: 1,
                    fuelingAreaDestination: 1,
                    tripSheetGenerationDateTime: 1,
                    settelment: 1,
                    bowser: 1,
                    totalLoadQuantity: 1,
                    totalLoadQuantityBySlip: 1,
                    saleQty: 1,
                    'loading.quantityByDip': 1,
                    balanceQtyBySlip: 1,
                    dispenses: {
                        $map: {
                            input: "$dispenses",
                            as: "dispense",
                            in: {
                                _id: "$$dispense._id",
                                verified: "$$dispense.verified",
                                posted: "$$dispense.posted",
                            }
                        }
                    }
                }
            }
        ]).sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json(tripSheets);
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/all' });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.get('/find-by-sheetId/:tripSheetId', async (req, res) => {
    const tripSheetId = req.params.tripSheetId;

    try {
        const sheets = await TripSheet.find({
            tripSheetId: { $regex: tripSheetId, $options: 'i' }
        });

        if (sheets.length === 0) {
            return res.status(404).json({ message: 'No Sheet found with the given tripSheetId number' });
        }
        res.status(200).json({ sheets });

    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/find-by-sheetId', tripSheetId });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.get('/find-by-id/:id', async (req, res) => {
    const id = req.params.id;

    try {
        // First, find all bowsers with the given registration number.
        const sheet = await TripSheet.findById(new Types.ObjectId(id));


        res.status(200).json(sheet);

    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/find-by-id', id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.get('/:id', async (req, res) => {
    const id = req.params.id;

    try {
        // First, find all bowsers with the given registration number.
        const sheet = await TripSheet.findById(new Types.ObjectId(id)).populate('loading.sheetId');
        res.status(200).json(sheet);

    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/:id', id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.get('/summary/get/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const sheet = await TripSheet.findById(id).populate('loading.sheetId').lean();

        if (!sheet) {
            return res.status(404).json({ message: 'TripSheet not found' });
        }

        res.status(200).json(sheet);

    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/summary/get', id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.get('/tripSheetId/:id', async (req, res) => {
    const id = req.params.id;
    try {
        // First, find all bowsers with the given registration number.
        const sheet = await TripSheet.findOne({ tripSheetId: id }).populate('loading.sheetId');
        res.status(200).json(sheet);

    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/tripSheetId', id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.patch('/update/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
        return res.status(400).json({ message: 'TripSheet ID is required.' });
    }

    try {
        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid TripSheet ID.' }));
        }
        if (!updateData || typeof updateData !== 'object') {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid update payload.' }));
        }

        const updatedTripSheet = await withTransaction(async (sessions) => {
            const updated = await TripSheet.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true, session: sessions.bowsers }
            );
            if (!updated) {
                const e = new Error('TripSheet not found.');
                e.name = 'ValidationError';
                throw e;
            }
            return updated;
        }, { connections: ['bowsers'], context: { route: '/update', tripSheetId: id } });

        res.status(200).json({ message: 'TripSheet updated successfully', updatedTripSheet });
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/update', tripSheetId: id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

// router.delete('/delete/:id', async (req, res) => {
//     const { id } = req.params;

//     if (!id) {
//         return res.status(400).json({ message: 'TripSheet ID is required.' });
//     }

//     try {
//         const deletedTripSheet = await TripSheet.findByIdAndDelete(id);

//         if (!deletedTripSheet) {
//             return res.status(404).json({ message: 'TripSheet not found.' });
//         }

//         // Reindex all remaining TripSheets
//         const tripSheets = await TripSheet.find().sort({ tripSheetId: 1 });
//         const highestId = tripSheets.length > 0 ? tripSheets[tripSheets.length - 1].tripSheetId : 0; // Get the highest existing ID
//         for (let i = 0; i < tripSheets.length; i++) {
//             tripSheets[i].tripSheetId = highestId + i + 1; // Reassign tripSheetId starting from the highest existing ID
//             await tripSheets[i].save(); // Save the updated TripSheet
//         }

//         // Update the counter model
//         await Counter.findOneAndUpdate(
//             { _id: 'tripSheetId' },
//             { seq: highestId + tripSheets.length }, // Set the counter to the current number of TripSheets
//             { new: true }
//         );

//         res.status(200).json({ message: 'TripSheet deleted successfully', deletedTripSheet });
//     } catch (err) {
//         console.error('Error deleting TripSheet:', err);
//         res.status(500).json({ message: 'Failed to delete TripSheet', error: err.message });
//     }
// });

router.get('/find-sheet-id-by-userId/:id', async (req, res) => {
    let id = req.params.id
    try {
        // const tripsheet = await TripSheet.findOne({'bowserDriver.id'=id})
        // // Extract query parameters
        // const { name, id, phoneNo } = req.query;
        // // Build the search criteria
        const searchCriteria = {};
        // if (name) searchCriteria['bowserDriver.name'] = name;
        if (id) searchCriteria['bowserDriver.id'] = id;
        // if (phoneNo) searchCriteria['bowserDriver.phoneNo'] = phoneNo;

        // // Search for the trip sheet
        const tripSheet = await TripSheet.findOne(searchCriteria).select('tripSheetId');

        if (!tripSheet) {
            return res.status(404).json({ message: 'Trip sheet not found' });
        }

        res.status(200).json(tripSheet.tripSheetId);
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/find-sheet-id-by-userId', userId: id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.post('/close-trip/:id', async (req, res) => {
    const id = req.params.id;
    const { userDetails, reason, remarks, dateTime } = req.body;
    try {
        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid TripSheet ID.' }));
        }
        if (!userDetails?.id || !userDetails?.name || !reason || !dateTime) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Missing required fields: userDetails, reason, dateTime' }));
        }

        await withTransaction(async (sessions) => {
            const tripsheet = await TripSheet.findById(new Types.ObjectId(id)).session(sessions.bowsers);
            if (!tripsheet) {
                const e = new Error("can't find the trip sheet");
                e.name = 'ValidationError';
                throw e;
            }

            const settlement = {
                dateTime,
                settled: true,
                details: {
                    by: {
                        id: userDetails.id,
                        name: userDetails.name
                    }
                }
            };
            const closure = {
                dateTime,
                details: { reason, remarks }
            };

            tripsheet.settelment = settlement;
            tripsheet.closure = closure;
            await tripsheet.save({ session: sessions.bowsers });

            // Clear bowser currentTrip
            await updateBowser({ regNo: tripsheet.bowser.regNo }, { $unset: { currentTrip: '' } }, { session: sessions.bowsers });
        }, { connections: ['bowsers'], context: { route: '/close-trip', tripSheetId: id } });

        res.status(200).json({ message: 'Trip sheet closed successfully' });
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/close-trip', tripSheetId: id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.post('/settle/:id', async (req, res) => {
    let id = req.params.id;
    let { chamberwiseDipList, pumpReading, dateTime, odometer, userDetails, extras } = req.body;
    try {
        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid TripSheet ID.' }));
        }
        if (!Array.isArray(chamberwiseDipList) || chamberwiseDipList.length === 0 || !dateTime || !userDetails?.id || !userDetails?.name) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Missing required fields for settlement.' }));
        }

        const tripsheet = await withTransaction(async (sessions) => {
            let sheet = await TripSheet.findById(new Types.ObjectId(id)).session(sessions.bowsers);
            if (!sheet) {
                const e = new Error("can't find the trip sheet");
                e.name = 'ValidationError';
                throw e;
            }
            const bowserRegNo = sheet.bowser.regNo;
            const bowser = await findOneBowser({ regNo: bowserRegNo }).session(sessions.bowsers);
            if (!bowser) {
                const e = new Error("can't find the bowser");
                e.name = 'ValidationError';
                throw e;
            }
            for (const dip of chamberwiseDipList) {
                if (dip.qty == null || dip.qty === undefined || dip.qty === 0) {
                    dip.qty = calculateQty(bowser.chambers, dip.chamberId, dip.levelHeight).toFixed(2);
                }
            }

            // compute totalQty
            const totalQty = chamberwiseDipList.reduce((acc, chamber) => {
                const sanitizedQty = String(chamber.qty).replace(/[^0-9.]/g, '');
                const qty = parseFloat(sanitizedQty);
                return !isNaN(qty) ? acc + qty : acc;
            }, 0);

            const settlement = {
                dateTime,
                settled: true,
                details: {
                    chamberwiseDipList,
                    pumpReading,
                    totalQty,
                    odometer,
                    extras,
                    by: { id: userDetails.id, name: userDetails.name }
                }
            };
            sheet.settelment = settlement;
            await sheet.save({ session: sessions.bowsers });
            await updateBowser({ regNo: bowserRegNo }, { $unset: { currentTrip: '' } }, { session: sessions.bowsers });
            return sheet;
        }, { connections: ['bowsers'], context: { route: '/settle', tripSheetId: id } });

        res.status(200).json({ message: 'Settlement processed successfully' });

        // Notify outside transaction
        try {
            const message = `${tripsheet.tripSheetId} is settled\nNow you can make your move to data entry`;
            const options = {
                title: 'Trip Sheet Settled',
                url: `/dispense-records?tripNumber=${tripsheet.tripSheetId}&limit=${tripsheet.dispenses.length}`,
            };
            await sendBulkNotifications({ groups: ['Data Entry'], message, options, platform: 'web' });
        } catch (notifyErr) {
            console.error('Notification error (data entry):', notifyErr?.message || notifyErr);
        }
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/settle', tripSheetId: id });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

router.post('/check-settelment/:id', async (req, res) => {
    let id = req.params.id;
    let { chamberwiseDipList, pumpReading, dateTime, odometer, userDetails, extras } = req.body;
    try {
        let tripsheet = await TripSheet.findById(new Types.ObjectId(id)).populate('loading.sheetId');
        if (!tripsheet) {
            throw new Error(`can't find the trip sheet`);
        }
        let bowserRegNo = tripsheet.bowser.regNo;
        let bowser = await findOneBowser({ regNo: bowserRegNo });
        if (!bowser) {
            throw new Error(`can't find the bowser`);
        }
        for (const dip of chamberwiseDipList) {
            if (dip.qty == null || dip.qty === undefined || dip.qty === 0) {
                dip.qty = calculateQty(bowser.chambers, dip.chamberId, dip.levelHeight).toFixed(2);
            }
        }

        // Update the tripsheet with the new chamberwiseDipList
        let totalQty = chamberwiseDipList.reduce((acc, chamber) => {
            // Remove invalid characters (e.g., multiple decimals)
            let sanitizedQty = chamber.qty.replace(/[^0-9.]/g, ''); // Remove non-numeric, non-decimal characters
            let qty = parseFloat(sanitizedQty);
            if (!isNaN(qty)) {
                return acc + qty;
            } else {
                console.warn(`Invalid qty value after sanitization: ${chamber.qty}`);
                return acc; // Skip invalid entries
            }
        }, 0);
        let settlement = {
            dateTime,
            settled: true,
            details: {
                chamberwiseDipList,
                pumpReading,
                totalQty,
                odometer,
                extras,
                by: {
                    id: userDetails.id,
                    name: userDetails.name
                }
            }
        };
        tripsheet.settelment = settlement;
        res.status(200).json({ message: 'Settlement processed successfully', tripsheet }); ``
        // try {
        //     await tripsheet.save(); // Save the updated tripsheet
        //     res.status(200).json({ message: 'Settlement processed successfully' });
        //     // notify data entry department
        //     let message = `${tripsheet.tripSheetId} is settled\nNow you can make your move to data entry`;
        //     let options = {
        //         title: "Trip Sheet Settled",
        //         url: `/dispense-records?tripNumber=${tripsheet.tripSheetId}&limit=${tripsheet.dispenses.length}`,
        //     }
        //     await sendBulkNotifications({
        //         groups: ["Data Entry"],
        //         message: message,
        //         options: options,
        //         platform: "web",
        //     });
        // } catch (error) {
        //     console.error(`Error saving settlement: ${error}`);
        //     res.status(500).json({ message: 'Failed to process settlement' });
        // }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
});

router.post('/addition/:id', async (req, res) => {
    const sheetId = req.params.id
    const { quantity, dateTime, by } = req.body

    try {
        if (!sheetId) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'TripSheet ID is required.' }));
        }
        const qty = Number(quantity);
        if (Number.isNaN(qty) || qty <= 0 || !dateTime || !by) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid addition payload.' }));
        }

        await withTransaction(async (sessions) => {
            const newAddition = { at: dateTime, by, quantity: qty };
            const addition = await updateTripSheet({ sheetId, newAddition, session: sessions.bowsers });
            if (!addition?.success) {
                const e = new Error(addition?.message || 'Addition failed');
                e.name = 'ValidationError';
                throw e;
            }
        }, { connections: ['bowsers'], context: { route: '/addition', sheetId } });

        res.status(200).json({ success: true, message: `Addition to the trip with _id: ${sheetId}, addition of ${qty} is successful` })
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/addition', sheetId });
        return res.status(errorResponse.status).json(errorResponse);
    }
})

router.delete('/delete-dispense', async (req, res) => {
    const id = req.query.id
    const sheetId = req.query.tripSheetId

    try {
        if (!id || !sheetId) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'dispense id and tripSheetId are required' }));
        }
        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json(createErrorResponse({ status: 400, message: 'Invalid dispense id' }));
        }

        await withTransaction(async (sessions) => {
            const tripSheet = await TripSheet.findOne({ tripSheetId: sheetId }).session(sessions.bowsers);
            if (!tripSheet) {
                const e = new Error('TripSheet not found');
                e.name = 'ValidationError';
                throw e;
            }

            const dispense = tripSheet.dispenses.find(d => d._id.toString() === id);
            if (!dispense) {
                const e = new Error('Dispense record not found');
                e.name = 'ValidationError';
                throw e;
            }

            tripSheet.dispenses = tripSheet.dispenses.filter(d => d._id.toString() !== id);
            await tripSheet.save({ session: sessions.bowsers });
        }, { connections: ['bowsers'], context: { route: '/delete-dispense', dispenseId: id, tripSheetId: sheetId } });

        res.status(200).json({ message: 'Dispense record deleted successfully' })
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/delete-dispense', dispenseId: id, tripSheetId: sheetId });
        return res.status(errorResponse.status).json(errorResponse);
    }
})

router.post('/verify-opening', async (req, res) => {
    const { tripSheetId } = req.body;
    console.log('tripSheetId:', tripSheetId);
    try {
        if (!tripSheetId) {
            console.error('TripSheet ID is required.');
            return res.status(400).json({ message: 'TripSheet ID is required.' });
        }
        const trip = await TripSheet.find({ tripSheetId }).select('settelment');
        console.log('trip:', trip);
        if (!trip) {
            console.error('TripSheet not found for ID:', tripSheetId);
            return res.status(404).json({ message: 'TripSheet not found.' });
        }
        return res.status(200).json({
            message: 'TripSheet found',
            trip: trip[0],
            isSetteled: trip[0].settelment && trip[0].settelment.settled === true ? true : false
        });
    } catch (err) {
        const errorResponse = handleTransactionError(err, { route: '/verify-opening', tripSheetId });
        return res.status(errorResponse.status).json(errorResponse);
    }
});

export default router;
