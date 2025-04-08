import { Router } from 'express';
import { checkTallyStatus } from './tallyStatus.js';
import axios from 'axios';
const router = Router();

router.get('/', async (req, res) => {
    const status = await checkTallyStatus();
    res.json(status);
});

router.post('/tally', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:9000', req.body, {
            headers: { 'Content-Type': 'application/xml' }
        });
        res.send(response.data);
    } catch (err) {
        res.status(500).send('Error connecting to Tally: ' + err.message);
    }
});

export default router;
