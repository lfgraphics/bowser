const express = require('express');
const router = express.Router();
const Driver = require('../models/driver');
const argon2 = require('argon2');

router.get('/', async (req, res) => {
    const { params } = req.query;
    try {
        const drivers = await Driver.find({
            $and: [
                { $or: [{ Name: { $regex: params, $options: 'i' } }, { 'MobileNo.MobileNo': { $regex: params } }] },
                {
                    $or: [
                        { inActive: { $exists: false } },
                        { inActive: false }
                    ]
                }
            ]
        }).sort({ _id: -1 }).limit(20).lean();
        if (!drivers) {
            console.log('nothing found with the params: ', params);
            return res.status(400).json({ message: "No data found with the given params" })
        }
        return res.status(200).json(drivers)
    } catch (err) {
        console.error('Error in drivers finidn route: ', err)
        return res.status(500).json({ message: 'Server Error!', err })
    }
});

router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const deletedDriver = await Driver.findOneAndUpdate(
            { _id: id },
            { $set: { inActive: true } },
            { new: true }
        );
        if (!deletedDriver) {
            return res.status(400).json({ message: "can't find the driver" });
        }
        console.log('deleted: ', deletedDriver);
        return res.status(200).json(deletedDriver);
    } catch (err) {
        console.error(err);
        return res.status(500).json(err);
    }
});

router.post('/change-password/:id', async (req, res) => {
    const id = req.params.id;
    const { password } = req.body;
    if (!id) return res.status(401).json({ message: "id is required!" });
    try {
        const hashedPassword = await argon2.hash(password);
        const updatedDriver = await Driver.findOneAndUpdate(
            { Name: { $regex: id } },
            { password: hashedPassword },
            { new: true }
        );
        if (!updatedDriver) {
            return res.status(404).json({ message: "Driver not found with the given id." });
        }
        return res.status(200).json({ message: "Password updated successfully", updatedDriver });
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Server Error!", err })
    }
});

router.get('/block-driver/:id', async (req, res) => {
    const id = req.params.id;
    if (!id) return res.status(401).json({ message: "id is required!" });
    try {
        const updatedDriver = await Driver.findOneAndUpdate(
            { _id: id },
            { verified: false },
            { new: true }
        );
        if (!updatedDriver) {
            return res.status(404).json({ message: "Driver not found with the given id." });
        }
        return res.status(200).json({ message: "Blocked the driver", updatedDriver });
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Server Error!", err })
    }
});

router.get('/unblock-driver/:id', async (req, res) => {
    const id = req.params.id;
    if (!id) return res.status(401).json({ message: "id is required!" });
    try {
        const updatedDriver = await Driver.findOneAndUpdate(
            { _id: id },
            { verified: true },
            { new: true }
        );
        if (!updatedDriver) {
            return res.status(404).json({ message: "Driver not found with the given id." });
        }
        return res.status(200).json({ message: "Un Blocked the driver", updatedDriver });
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Server Error!", err })
    }
});

router.get('/mark-as-keypd/:id', async (req, res) => {
    const id = req.params.id;
    if (!id) return res.status(401).json({ message: "id is required!" });
    try {
        const updatedDriver = await Driver.findOneAndUpdate(
            { Name: id },
            { $set: { keypad: true } },
            { new: true }
        );
        if (!updatedDriver) {
            return res.status(404).json({ message: "Driver not found with the given id." });
        }
        return res.status(200).json({ message: "Driver has been makerd as keypad user", updatedDriver });
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Server Error!", err })
    }
});

module.exports = router;