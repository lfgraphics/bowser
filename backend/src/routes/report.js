import { Router } from 'express';
import Report from '../models/reports.js';
import { sendBulkNotifications } from '../utils/pushNotifications.js';
const router = Router();

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
        console.log('Report recieved: ', sentNotification);
        res.status(200).json({ report, message: 'successfully submitted' });
    } catch (error) {
        console.error(error)
        res.status(400).json(error)
    }
})


export default router;