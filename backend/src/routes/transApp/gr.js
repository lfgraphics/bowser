import { Router } from 'express';
const router = Router();
import GR from '../../models/GR.js';

router.get('/', async (req, res) => {
    const { 
        grNo, 
        loadingDateFrom, 
        loadingDateTo, 
        unloadingDateFrom, 
        unloadingDateTo, 
        billed, 
        consignee, 
        consignor, 
        company 
    } = req.query;

    const query = {};

    if (grNo) {
        query.GRNo = { $regex: grNo, $options: 'i' };
    }

    if (loadingDateFrom || loadingDateTo) {
        query['loading.date'] = {};
        if (loadingDateFrom) query['loading.date'].$gte = new Date(loadingDateFrom);
        if (loadingDateTo) query['loading.date'].$lte = new Date(loadingDateTo);
    }

    if (unloadingDateFrom || unloadingDateTo) {
        query['unloading.vM.date'] = {};
        if (unloadingDateFrom) query['unloading.vM.date'].$gte = new Date(unloadingDateFrom);
        if (unloadingDateTo) query['unloading.vM.date'].$lte = new Date(unloadingDateTo);
    }

    if (billed !== undefined) {
        query.billed = billed === 'true';
    }

    if (consignee) {
        query.consignee = { $regex: consignee, $options: 'i' };
    }

    if (consignor) {
        query.consignor = { $regex: consignor, $options: 'i' };
    }

    if (company) {
        query['unloading.gM.company'] = { $regex: company, $options: 'i' };
    }

    try {
        const gr = await GR.find(query).sort({ _id: -1 }).limit(50).lean();
        res.status(200).json(gr);
    } catch (error) {
        console.error('Error fetching GRs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Accounts Manager (aM) Route
router.post('/unloading/am', async (req, res) => {
    const { grId, qty, taxInvoiceNo, excisePassNo, excisePassDate } = req.body;

    if (!grId || !qty) {
        return res.status(400).json({ error: 'GR ID and Quantity are required' });
    }

    try {
        const gr = await GR.findById(grId);
        if (!gr) {
            return res.status(404).json({ error: 'GR not found' });
        }

        const numericQty = Number(qty);
        // Calculate shortage based on loading qty
        const shortage = gr.loading.qty - numericQty;

        const updateData = {
            'unloading.aM': {
                qty: numericQty,
                shortage: shortage
            }
        };

        if (taxInvoiceNo) updateData.taxInvoiceNo = taxInvoiceNo;
        if (excisePassNo) updateData.excisePassNo = excisePassNo;
        if (excisePassDate) updateData.excisePassDate = new Date(excisePassDate);

        const updatedGR = await GR.findByIdAndUpdate(grId, { $set: updateData }, { new: true });
        res.status(200).json(updatedGR);
    } catch (error) {
        console.error('Error updating GR for AM:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GR Manager (gM) Route
router.post('/unloading/gm', async (req, res) => {
    const { grId, image, qty, company, excisePassNo, excisePassDate } = req.body;

    if (!grId || !qty || !company || !image) {
        return res.status(400).json({ error: 'GR ID, Quantity, Company and Image are required' });
    }

    try {
        const gr = await GR.findById(grId);
        if (!gr) {
            return res.status(404).json({ error: 'GR not found' });
        }

        const numericQty = Number(qty);
        // Calculate shortage based on loading qty
        const shortage = gr.loading.qty - numericQty;

        const updateData = {
            'unloading.gM': {
                qty: numericQty,
                image: image,
                company: company,
                shortage: shortage
            }
        };

        if (excisePassNo) updateData.excisePassNo = excisePassNo;
        if (excisePassDate) updateData.excisePassDate = new Date(excisePassDate);

        const updatedGR = await GR.findByIdAndUpdate(grId, { $set: updateData }, { new: true });
        res.status(200).json(updatedGR);
    } catch (error) {
        console.error('Error updating GR for GM:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;