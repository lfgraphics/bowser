import { Router } from 'express';
import { checkTallyStatus } from './tallyStatus.js';
import axios from 'axios';
import xml2js from 'xml2js'; // Add this package for XML parsing

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

        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);

        const status = result.ENVELOPE?.HEADER?.[0]?.STATUS?.[0];
        const lineError = result.ENVELOPE?.BODY?.[0]?.DATA?.[0]?.LINEERROR?.[0];
        const importResult = result.ENVELOPE?.BODY?.[0]?.DATA?.[0]?.IMPORTRESULT?.[0];

        if (status === '0') {
            return res.status(400).json({
                error: true,
                message: lineError || 'Unknown error occurred'
            });
        }

        if (status === '1') {
            return res.status(200).json({
                success: true,
                data: {
                    created: importResult?.CREATED?.[0] || 0,
                    altered: importResult?.ALTERED?.[0] || 0,
                    deleted: importResult?.DELETED?.[0] || 0,
                    lastVchId: importResult?.LASTVCHID?.[0] || null,
                    vchNumber: importResult?.VCHNUMBER?.[0] || null
                }
            });
        }

        return res.status(500).json({ error: 'Unexpected response status' });

    } catch (err) {
        console.error('❌ Error in /tally:', err);
        res.status(500).json({ error: 'Error connecting to Tally', message: err.message });
    }
});

export default router;
