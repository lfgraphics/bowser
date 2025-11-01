import Joi from 'joi';
import momentTz from 'moment-timezone';
const { tz } = momentTz;
import { Router } from 'express';
const router = Router();
import { findById as findTripById, findByIdAndUpdate as updateTripById } from '../../models/VehiclesTrip.js';
import { createEmptyTrip, updateEmptyTrip } from './utils.js';

// const { getCurrentTrip, getAllTrips } = require('./utils');

router.post('/update', async (req, res) => {
    const { tripId, data } = req.body;

    if (!tripId || !data) {
        return res.status(400).json({ error: 'Trip ID and data are required.' });
    }

    try {
        const trip = await findTripById(tripId);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found.' });
        }

        if (!Array.isArray(trip.TravelHistory)) {
            trip.TravelHistory = [];
        }
        trip.TravelHistory.push(data);
        await trip.save();

        return res.status(200).json({ message: 'Travel history updated successfully.' });
    } catch (error) {
        console.error('Error updating travel history:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/report', async (req, res) => {
    const { tripId, data } = req.body;

    console.log("reporting: ")

    if (!tripId || !data) {
        return res.status(400).json({ error: 'Trip ID and travel history are required.' });
    }

    try {
        const trip = await findTripById(tripId);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found.' });
        }

        if (!Array.isArray(trip.TravelHistory)) {
            trip.TravelHistory = [];
        }
        trip.TravelHistory.push(data);

        if (trip.LoadStatus === 0) {
            trip.EmptyTripDetail.ReportDate = data.TrackUpdateDate || new Date();
            trip.EmptyTripDetail.EndOdometer = data.OdometerOnTrackUpdate || 0;
            trip.ReportingDate = data.TrackUpdateDate || new Date();
            trip.loadingSuperVisor = data.loadingSuperVisor
        } else if (trip.LoadStatus == 1) {
            trip.ReportingDate = data.TrackUpdateDate || new Date();
            trip.TallyLoadDetail.ReportedDate = data.TrackUpdateDate || new Date();
            trip.TallyLoadDetail.EndOdometer = data.OdometerOnTrackUpdate || 0;
            trip.LoadTripDetail.ReportDate = data.TrackUpdateDate || new Date();
            trip.LoadTripDetail.EndOdometer = data.OdometerOnTrackUpdate || 0;
        }

        await trip.save();

        return res.status(200).json({ message: 'Travel history updated successfully.' });
    } catch (error) {
        console.error('Error updating travel history:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/destination-change', async (req, res) => {
    const { tripId, data } = req.body;

    const schema = Joi.object({
        tripId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
        data: Joi.object({
            VehicleNo: Joi.string().required(),
            driverName: Joi.string().min(1).required(),
            driverMobile: Joi.string().pattern(/^\d{10}$/).optional(),
            stackHolder: Joi.string().required(),
            proposedDate: Joi.date().iso().required(),
            targetTime: Joi.string().optional(),
            odometer: Joi.number().min(0).optional(),
            orderedBy: Joi.string().required(),
            proposedBy: Joi.string().required(),
            previousTripId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
            StartFrom: Joi.string().required(),
            division: Joi.string().required(),
            modificationCheck: Joi.boolean().required(),
            ManagerComment: Joi.string().required()
            // ManagerComment: Joi.string().allow('').optional()
        }).required()
    });

    const nowInIST = tz('Asia/Kolkata').toDate();

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        let updatedTrip = null;
        let newTrip = null;

        const tripExists = await findTripById(tripId)
        if (!tripExists) {
            throw new Error('Trip not found.');
        }

        if (!data.modificationCheck) {
            updatedTrip = await updateEmptyTrip(tripId, data);
            if (!updatedTrip) {
                throw new Error('Trip update failed.');
            }
            return res.status(200).json({
                message: 'Trip updated successfully.',
                updatedTrip,
                newTrip: null
            });
        } else {
            // load the trip, modify fields, push history, then save
            updatedTrip = tripExists; // reuse the trip we already fetched above

            // ensure nested objects exist
            if (!updatedTrip.EmptyTripDetail || typeof updatedTrip.EmptyTripDetail !== 'object') {
                updatedTrip.EmptyTripDetail = {};
            }
            if (!Array.isArray(updatedTrip.TravelHistory)) {
                updatedTrip.TravelHistory = [];
            }

            // apply updates
            updatedTrip.EndDate = nowInIST;
            updatedTrip.EndOdometer = data.odometer;
            updatedTrip.EmptyTripDetail.EndDate = nowInIST;
            updatedTrip.EmptyTripDetail.EndOdometer = data.odometer;

            // push travel history entry
            updatedTrip.TravelHistory.push({
                TrackUpdateDate: nowInIST,
                LocationOnTrackUpdate: data.StartFrom,
                OdometerOnTrackUpdate: data.odometer,
                ManagerComment: data.ManagerComment !== undefined ? data.ManagerComment : '',
                Driver: data.driverName,
            });

            // save and get the updated document
            updatedTrip = await updatedTrip.save();

            if (!updatedTrip) {
                throw new Error('Trip not found.');
            }

            newTrip = await createEmptyTrip(data);

            return res.status(200).json({
                message: 'Trip updated and new trip created successfully.',
                updatedTrip,
                newTrip
            });
        }
    } catch (error) {
        console.error('Error in destination-change:', {
            error: error.message,
            tripId,
            data,
            stack: error.stack
        });
        return res.status(500).json({ error: 'Failed to process request.', details: error.message });
    }
});

router.post('/loaded', async (req, res) => {
    const { tripId, data } = req.body;

    console.log(data)

    const schema = Joi.object({
        tripId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
        data: Joi.object({
            driverName: Joi.string().min(1).required(),
            driverMobile: Joi.string().pattern(/^\d{10}$/).required(),
            EndDestination: Joi.string().required(),
            EndLocation: Joi.string().required(),
            EndDate: Joi.alternatives().try(
                Joi.date().required(),
                Joi.string().required()
            ).required(),
            GoodsLoaded: Joi.string().required(),
            QtyLoaded: Joi.number().min(0).required(),
            OdometerOnTrackUpdate: Joi.number().min(0).required(),
            LocationOnTrackUpdate: Joi.string().required(),
            TrackUpdateDate: Joi.alternatives().try(
                Joi.date().required(),
                Joi.string().required()
            ).required(),
            ManagerComment: Joi.string().required(),
            targetTime: Joi.alternatives().try(
                Joi.date().required(),
                Joi.string().required()
            ).required(),
            orderedBy: Joi.string().required(),
            proposedBy: Joi.string().required(),
        }).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    try {
        const tripToUpdate = await updateTripById(tripId,
            {
                $set: {
                    EndTo: data.EndLocation,
                    'EmptyTripDetail.EndDate': data.TrackUpdateDate,
                    'EmptyTripDetail.EndDestination': data.EndDestination,
                    'EmptyTripDetail.EndLocation': data.EndLocation,
                    'EmptyTripDetail.GoodsLoaded': data.GoodsLoaded,
                    'EmptyTripDetail.QtyLoaded': data.QtyLoaded
                },
                $push: {
                    TravelHistory: {
                        TrackUpdateDate: data.TrackUpdateDate,
                        LocationOnTrackUpdate: data.LocationOnTrackUpdate,
                        OdometerOnTrackUpdate: data.OdometerOnTrackUpdate,
                        ManagerComment: data.ManagerComment !== undefined ? data.ManagerComment : '',
                        Driver: data.driverName,
                    }
                }
            }, { new: true }
        )
        if (!tripToUpdate) {
            return res.status(404).json({ error: 'Trip not found' })
        }

        const saveTrip = await tripToUpdate.save()
        if (saveTrip) {
            return res.status(200).json({ message: 'Trip updated successfully', saveTrip })
        } else {
            throw new Error('Error updating the trip. Try again later');
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Failed to process request.', details: error.message });
    }
});

router.post('/unload', async (req, res) => {
    const { tripId, data } = req.body;

    if (!tripId || !data) {
        return res.status(400).json({ error: 'Trip ID and travel history are required.' });
    }

    try {
        const trip = await findTripById(tripId);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found.' });
        }

        if (!Array.isArray(trip.TravelHistory)) {
            trip.TravelHistory = [];
        }
        trip.TravelHistory.push(data);

        trip.EndDate = data.TrackUpdateDate || new Date();
        trip.LoadTripDetail.UnloadDate = data.TrackUpdateDate || new Date();
        trip.TallyLoadDetail.UnloadingDate = data.TrackUpdateDate || new Date();
        trip.TallyLoadDetail.EndOdometer = data.OdometerOnTrackUpdate || 0;
        trip.LoadTripDetail.EndOdometer = data.OdometerOnTrackUpdate || 0;

        await trip.save();

        return res.status(200).json({ message: 'Travel history updated successfully.' });
    } catch (error) {
        console.error('Error updating travel history:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/create-empty-trip', async (req, res) => {
    const { postData } = req.body;
    try {
        const savedTrip = await createEmptyTrip(postData);
        console.log('Created empty trip: ', savedTrip);
        return res.status(201).json({ message: 'Empty trip created successfully', trip: savedTrip });
    } catch (err) {
        console.error('Error creating empty tanker trip: ', err.message);
        return res.status(400).json({ message: 'Failed creating Empty tanker trip', error: err.message });
    }
});

router.post('/update-trip-status/:tripId', async (req, res) => {
    const { tripId } = req.params;
    const { statusUpdate } = req.body;
    console.log('Status update request received:', { tripId, statusUpdate });
    try {
        if (!statusUpdate || !statusUpdate.status || !statusUpdate.dateTime || !statusUpdate.user || !statusUpdate.user._id || !statusUpdate.user.name) {
            return res.status(400).json({ error: 'Invalid status update data.' });
        }
        const trip = await findTripById(tripId);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found.' });
        }
        if (!Array.isArray(trip.statusUpdate)) {
            trip.statusUpdate = [];
        }
        trip.statusUpdate.push(statusUpdate);
        await trip.save();
        return res.status(200).json({ message: 'Trip status updated successfully.', trip });
    } catch (error) {
        console.error('Error updating trip status:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/update-trip/:tripId', async (req, res) => {
    const { tripId } = req.params;
    let updateData = req.body;
    try {
        if (!updateData || typeof updateData !== 'object') {
            return res.status(400).json({ error: 'Invalid update data.' });
        }
        // Allow clients to send MongoDB update operators (e.g., $set, $unset)
        const hasMongoOps = Object.keys(updateData).some((k) => k.startsWith('$'));
        const update = hasMongoOps ? updateData : { $set: updateData };

        // Backend normalization: keep EndDate and LoadTripDetail.UnloadDate in sync
        try {
            const setObj = update.$set || {};
            const unsetObj = update.$unset || {};

            // If either EndDate or UnloadDate is being set, ensure both are set to the same value
            const endDateVal = setObj.EndDate;
            const unloadVal = setObj['LoadTripDetail.UnloadDate'];
            const finalDate = endDateVal || unloadVal;
            if (finalDate) {
                setObj.EndDate = finalDate;
                setObj['LoadTripDetail.UnloadDate'] = finalDate;
            }

            // If either is being unset, unset both
            const unsetEnd = Object.prototype.hasOwnProperty.call(unsetObj, 'EndDate');
            const unsetUnload = Object.prototype.hasOwnProperty.call(unsetObj, 'LoadTripDetail.UnloadDate');
            if (unsetEnd || unsetUnload) {
                unsetObj.EndDate = '';
                unsetObj['LoadTripDetail.UnloadDate'] = '';
            }

            // Avoid conflicting operators on the same path
            Object.keys(unsetObj).forEach((k) => {
                if (k in setObj) delete setObj[k];
            });

            // Write back possibly mutated operators
            if (Object.keys(setObj).length) update.$set = setObj; else delete update.$set;
            if (Object.keys(unsetObj).length) update.$unset = unsetObj; else delete update.$unset;
        } catch (normErr) {
            console.warn('Normalization warning (update-trip):', normErr?.message || normErr);
        }

        const trip = await updateTripById(tripId, update, { new: true });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found.' });
        }
        return res.status(200).json({ message: 'Trip updated successfully.', trip });
    } catch (error) {
        console.error('Error updating trip:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;