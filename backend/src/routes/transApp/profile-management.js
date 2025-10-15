import { Router } from 'express';
const router = Router();
import { findOne as findOneTransUser } from '../../models/TransUser.js';
import DeactivatedVehicle, { find as findDeactivatedVehicles, deleteMany as deleteManyDeactivatedVehicles } from '../../models/DeactivatedVehicles.js';
import { hash } from 'argon2';
import { division } from './utils.js';

router.get('/inactive-vehicles/:userId', async (req, res) => {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ message: "User id is required." })
    try {
        const user = await findOneTransUser({ _id: userId });
        const userVehicles = user.myVehicles || [];
        const userName = user.UserName;
        const deactivatedVehiclesList = await findDeactivatedVehicles({ 'UserInfo.CreatedBy': userName, VehicleNo: { $in: userVehicles } });
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
        await deleteManyDeactivatedVehicles({ VehicleNo: vehicleNo })
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
        let user = await findOneTransUser({ UserName: userName });
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
        const user = await findOneTransUser({ UserName: userName });

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

router.post('/update-profile', async (req, res) => {
    const { userName, phoneNumber, password, photo, id } = req.body;
    if (!userName || !phoneNumber || !id) {
        return res.status(400).json({ message: "userName, phoneNumber and id are required." });
    }
    try {
        const user = await findOneTransUser({ _id: id });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        user.UserName = userName;
        user.phoneNumber = phoneNumber;

        if (password) {
            const hashedPassword = await hash(password);
            user.Password = hashedPassword;
            user.hashed = true;
        }

        if (photo) {
            user.Photo = Buffer.from(photo, 'base64');
        }

        await user.save();
        await user.save();

        const responseUser = {
            _id: user._id,
            userId: user.UserName,
            phoneNumber: user.phoneNumber,
            name: user.UserName,
            Photo: user.Photo,
            Division: (typeof division !== 'undefined' ? division[user.Division] : user.Division),
            vehicles: user.myVehicles || [],
            roles: ['Trans App'],
            verified: true
        };

        return res.status(200).json({ message: "Profile updated successfully.", user: responseUser });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});


export default router;