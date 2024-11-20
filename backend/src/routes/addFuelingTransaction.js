const express = require('express');
const router = express.Router();
const FuelingTransaction = require('../models/fuelingTransaction');

const fetchLocationData = async (latitude, longitude) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.address) {
            const { county: state, city, town, village } = data.address;
            const location = city || town || village;
            let obj = `${location}, ${data.address.state_district}, ${state}`
            return obj
        } else {
            console.log(`Unable to capture the location by nominatim's api- Cord are: lat = ${latitude}, long = ${longitude}`);
            return null;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
};


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

        res.status(200).json({ message: 'Data Submitted successfully' });
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