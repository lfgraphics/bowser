import { Router } from 'express';
const router = Router();
import GR from '../../models/GR.js';
import { verifyUser } from './utils.js';

router.get('/', verifyUser, async (req, res) => {
    const { 
        search,
        grNo, 
        vehicleNo,
        loadingDateFrom, 
        loadingDateTo, 
        unloadingDateFrom, 
        unloadingDateTo, 
        status, // 'pending', 'unloaded'
        consignee, 
        consignor, 
        company,
        minQty,
        maxQty,
        sortBy = 'loadingDate',
        sortOrder = 'desc',
        page = 1,
        limit = 50
    } = req.query;

    const query = {};

    // Advanced Search (Search multiple fields at once)
    if (search) {
        const searchRegex = { $regex: search, $options: 'i' };
        query.$or = [
            { GRNo: searchRegex },
            { vehicleNo: searchRegex },
            { consignee: searchRegex },
            { consignor: searchRegex }
        ];
    }

    // Specific field filters
    if (grNo) query.GRNo = { $regex: grNo, $options: 'i' };
    if (vehicleNo) query.vehicleNo = { $regex: vehicleNo, $options: 'i' };
    if (consignee) query.consignee = { $regex: consignee, $options: 'i' };
    if (consignor) query.consignor = { $regex: consignor, $options: 'i' };
    
    // Status Filter
    if (status) {
        if (status === 'unloaded') {
            query['unloading.gM.qty'] = { $exists: true, $ne: null };
        } else if (status === 'pending') {
            query['unloading.gM.qty'] = { $exists: false };
        }
    }

    // Qty Range Filter
    if (minQty || maxQty) {
        query['loading.qty'] = {};
        if (minQty) query['loading.qty'].$gte = Number(minQty);
        if (maxQty) query['loading.qty'].$lte = Number(maxQty);
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

    if (company) {
        query['unloading.gM.company'] = company;
    }

    // Sorting
    const sort = {};
    const sortField = sortBy === 'unloadingDate' ? 'unloading.vM.date' : 'loading.date';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    try {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const [grs, total, pendingTotal] = await Promise.all([
            GR.find(query)
              .select('-unloading.gM.image')
              .sort(sort)
              .skip(skip)
              .limit(limitNum)
              .lean(),
            GR.countDocuments(query),
            GR.countDocuments({ 'unloading.gM.qty': { $exists: false } })
        ]);

        res.status(200).json({
            grs,
            pagination: {
                total,
                pendingCount: pendingTotal,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error fetching GRs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Accounts Manager (aM) Route
router.post('/unloading/am', verifyUser, async (req, res) => {
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

        if (taxInvoiceNo) updateData.taxIncoiceNo = taxInvoiceNo;
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
router.post('/unloading/gm', verifyUser, async (req, res) => {
    const { grId, image, qty, company, excisePassNo, excisePassDate, grNo, vehicleNo } = req.body;

    // Check if GR exists first to see if it already has an image
    if (!grId || !qty || !company) {
        return res.status(400).json({ error: 'GR ID, Quantity, and Company are required' });
    }

    try {
        const gr = await GR.findById(grId);
        if (!gr) {
            return res.status(404).json({ error: 'GR not found' });
        }

        // If it's a first-time unloading (no GM qty yet), an image IS required
        const isFirstTimeUnloading = !gr.unloading?.gM?.qty;
        if (isFirstTimeUnloading && !image) {
            return res.status(400).json({ error: 'Image is required for first-time unloading' });
        }

        const numericQty = Number(qty);
        // Calculate shortage based on loading qty
        const shortage = gr.loading.qty - numericQty;

        // Build update object dynamically
        const updateData = {
            'unloading.gM.qty': numericQty,
            'unloading.gM.company': company,
            'unloading.gM.shortage': shortage
        };

        // Only update image if provided
        if (image) {
            updateData['unloading.gM.image'] = image;
        }

        if (grNo) updateData.GRNo = grNo;
        if (vehicleNo) updateData.vehicleNo = vehicleNo;
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