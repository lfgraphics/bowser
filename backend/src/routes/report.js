const express = require('express');
const Report = require('../models/reports');
const { sendBulkNotifications } = require('../utils/pushNotifications');
const router = express.Router();

router.post('/', async (req, res) => {
    const { reportId, reportMessage, devPersonal, reporter } = req.body
    try {
        let report = new Report({
            reportId,
            reportMessage,
            devPersonal,
            reporter
        });
        report.save()
        let sentNotification = await sendBulkNotifications({ groups: ['Admin'], message: String(reportId, reportMessage, devPersonal), platform: "web", options: { title: "New Issue Reported", data: { url: `/issues/${report._id}` } } })
        console.info('Report recieved: ', sentNotification);
        res.status(200).json({ report, message: 'successfully submitted' });
    } catch (error) {
        console.error(error)
        res.status(400).json(error)
    }
})


module.exports = router;