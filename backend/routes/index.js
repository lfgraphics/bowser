const express = require('express');
const router = express.Router();

const formSubmitRoutes = require('./formSubmit');
const searchDriverRoutes = require('./searchDriver');
const imageProcessingRoutes = require('./imageProcessing');

router.get('/', (req, res) => {
    res.send('landing page');
});

router.use('/formsubmit', formSubmitRoutes);
router.use('/searchDriver', searchDriverRoutes);
router.use('/imageprocessing', imageProcessingRoutes);

module.exports = router;