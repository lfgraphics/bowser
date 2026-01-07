import { Router } from 'express';
const router = Router();
import Customer from '../../models/Customer.js';
import Joi from 'joi';
import { ObjectId } from 'mongodb';

const schema = Joi.object({
    Name: Joi.string().required(),
    IsMainParty: Joi.string().required(),
    CompanyTag: Joi.string().required(),
    MailingName: Joi.string().required(),
    CustomerName: Joi.string().required(),
    CustGroup: Joi.string().required(),
    Address: Joi.string().required(),
    Country: Joi.string().required(),
    State: Joi.string().required(),
    Location: Joi.string().required(),
    PanNo: Joi.string().required(),
    RegtType: Joi.string().required(),
    GSTIN: Joi.string().required(),
    IsActiveCustomer: Joi.string().required(),
    IsBillingParty: Joi.string().required(),
    IsAttachedOwner: Joi.string().required(),
    IsConsiGnor: Joi.string().required(),
    IsConsignee: Joi.string().required(),
    ROuteDetention: Joi.array().required(),
    "Product Wise": Joi.array().required(),
    CommanLedger: Joi.string().allow('', null),
});

// C
router.post('/', async (req, res) => {
    try {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const customer = new Customer(value);
        await customer.save();
        res.send(customer);
    }
    catch (error) {
        console.error('Error creating customer:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// R
router.get('/', async (req, res) => {
    const query = req.query.search;

    if (query && ObjectId.isValid(query)) {
        const customer = await Customer.findById(query);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found.' });
        }
        return res.send(customer);
    } else {
        try {
            const customers = await Customer.find({
                $or: [
                    { Name: { $regex: query, $options: 'i' } },
                    { CustomerName: { $regex: query, $options: 'i' } },
                    { MailingName: { $regex: query, $options: 'i' } },
                    { Location: { $regex: query, $options: 'i' } },
                    { State: { $regex: query, $options: 'i' } },
                    { Country: { $regex: query, $options: 'i' } },
                    { PanNo: { $regex: query, $options: 'i' } },
                    { RegtType: { $regex: query, $options: 'i' } },
                    { GSTIN: { $regex: query, $options: 'i' } },
                ]
            }).lean();
            res.send(customers);
        }
        catch (error) {
            console.error('Error fetching customers:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
});

router.get('/get-customer-by-route/:route', async (req, res) => {
    try {
        const customers = await Customer.find({ 'ROuteDetention.Route': { $regex: req.params.route, $options: 'i' } }).lean();
        res.send(customers);
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/get-customer-by-location/:location', async (req, res) => {
    try {
        const customers = await Customer.find({ Location: { $regex: req.params.location, $options: 'i' } }).lean();
        res.send(customers);
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/get-customer/:id', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id).lean();
        res.send(customer);
    }
    catch (error) {
        console.error('Error fetching customer:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// U
router.put('/update/:id', async (req, res) => {
    try {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const customer = await Customer.findByIdAndUpdate(req.params.id, value, { new: true });
        res.send(customer);
    }
    catch (error) {
        console.error('Error updating customer:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// D
router.delete('/delete/:id', async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        res.send(customer);
    }
    catch (error) {
        console.error('Error deleting customer:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;