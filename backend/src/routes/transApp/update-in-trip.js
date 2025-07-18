const express = require('express');
const { mongoose } = require('mongoose');
const router = express.Router();
const TankersTrip = require('../../models/VehiclesTrip');
const { createEmptyTrip } = require('./utils');

const { getCurrentTrip, getAllTrips } = require('./utils');

router.post('/update', async (req, res) => {
    const { tripId, data } = req.body;

    if (!tripId || !data) {
        return res.status(400).json({ error: 'Trip ID and travel history are required.' });
    }

    try {
        const trip = await TankersTrip.findById(tripId);
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

    if (!tripId || !data) {
        return res.status(400).json({ error: 'Trip ID and travel history are required.' });
    }

    try {
        const trip = await TankersTrip.findById(tripId);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found.' });
        }

        if (!Array.isArray(trip.TravelHistory)) {
            trip.TravelHistory = [];
        }
        trip.TravelHistory.push(data);

        if (trip.LoadStatus == 0) {
            trip.EmptyTripDetail.ReportDate = data.TrackUpdateDate || new Date();
            trip.ReportingDate = data.TrackUpdateDate || new Date();
        } else if (trip.LoadStatus == 1) {
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

router.post('/unload', async (req, res) => {
    const { tripId, data } = req.body;

    if (!tripId || !data) {
        return res.status(400).json({ error: 'Trip ID and travel history are required.' });
    }

    try {
        const trip = await TankersTrip.findById(tripId);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found.' });
        }

        if (!Array.isArray(trip.TravelHistory)) {
            trip.TravelHistory = [];
        }
        trip.TravelHistory.push(data);

        trip.LoadTripDetail.UnloadDate = data.TrackUpdateDate || new Date();
        trip.LoadTripDetail.EndOdometer = data.OdometerOnTrackUpdate || 0;

        await trip.save();

        return res.status(200).json({ message: 'Travel history updated successfully.' });
    } catch (error) {
        console.error('Error updating travel history:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/check', (req, res) => {
    res.status(200).json({ message: 'Update in trip route is working.' });
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

module.exports = router;