const express = require('express');
const router = express.Router();
const TransUser = require('../../models/TransUser');
const DeactivatedVehicle = require('../../models/DeactivatedVehicles')

router.get('/inactive-vehicles/:userId', async (req, res) => {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ message: "User id is required." })
    try {
        const user = await TransUser.findOne({ _id: userId });
        const userVehicles = user.myVehicles || [];
        const userName = user.UserName;
        const deactivatedVehiclesList = await DeactivatedVehicle.find({ 'UserInfo.CreatedBy': userName, VehicleNo: { $in: userVehicles } });
        return res.status(200).json({ deactivatedVehiclesList })
    } catch (error) {
        console.error('Error fetching deactivated vehicles:', error);
        return res.status(500).json(error);
    }
})

router.get('/reactivate-vehicle/:vehicleNo', async (req, res) => {
    const vehicleNo = req.params.vehicleNo;
    if (!vehicleNo) return res.status(400).json({ message: "vehicle number is required." })
    try {
        await DeactivatedVehicle.deleteMany({ VehicleNo: vehicleNo })
        return res.status(200).json({ message: "Deleted successfully" })
    } catch (error) {
        console.error('Error activating vehicle:', error);
        return res.status(500).json(error);
    }
})

router.post('/deactivate-vehicle', async (req, res) => {
    const { vehicleNo, userName } = req.body;
    if (!vehicleNo || !userName) {
        return res.status(400).json({ error: "vehicle number and userName both are required." })
    }
    try {
        let newDeactivationEntry = new DeactivatedVehicle({
            VehicleNo: vehicleNo,
            UserInfo: {
                CreatedBy: userName,
                Created: new Date(Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })),
            }
        });
        const savEntry = await newDeactivationEntry.save()
        console.log(savEntry)
        if (!savEntry) {
            return res.status(404).json({ error: "Couldn't complete your request, try again later." })
        } else {
            return res.status(200).json({ message: "Request successfull", entry: savEntry })
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message })
    }
});

router.post('/delete-vehicle', async (req, res) => {
    const { vehicleNo, userName } = req.body;
    if (!vehicleNo || !userName) {
        return res.status(400).json({ error: "vehicle number and userName both are required." })
    }
    try {
        let user = await TransUser.findOne({ UserName: userName });
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        if (!user.myVehicles.includes(vehicleNo)) {
            return res.status(404).json({ message: "Vehicle not found for this user." });
        }

        user.myVehicles = user.myVehicles.filter((vehicle) => vehicle !== vehicleNo);
        await user.save();
        return res.status(200).json({ message: "Request successful." });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message });
    }
});

router.post('/add-vehicle', async (req, res) => {
    const { vehicleNo, userName } = req.body;

    if (!vehicleNo || !userName) {
        return res.status(400).json({ message: "vehicle number and userName both are required." });
    }

    try {
        const user = await TransUser.findOne({ UserName: userName });

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (!user.myVehicles) {
            user.myVehicles = [];
        }

        if (user.myVehicles.includes(vehicleNo)) {
            return res.status(409).json({ message: "User already has this vehicle." });
        }

        user.myVehicles.push(vehicleNo);
        await user.save();

        return res.status(200).json({ message: "Vehicle added successfully." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;