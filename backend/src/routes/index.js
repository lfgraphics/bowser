const express = require('express');
const router = express.Router();

const formSubmitRoutes = require('./formSubmit');
const searchDriverRoutes = require('./searchDriver');
const imageProcessingRoutes = require('./imageProcessing');
const authRoutes = require('./auth');

router.get('/', (req, res) => {
    res.send('landing page');
});

router.use('/formsubmit', formSubmitRoutes);
router.use('/searchDriver', searchDriverRoutes);
router.use('/imageprocessing', imageProcessingRoutes);
router.use('/auth', authRoutes);

module.exports = router;