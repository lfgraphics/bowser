const express = require('express');
const router = express.Router();
const User = require('../models/user');
const UnAuthorizedLogin = require('../models/unauthorizedLogin');
const mongoose = require('mongoose')

// Get all users with roles populated
router.get('/', async (req, res) => {
    const { searchParam } = req.query;
    try {
        if (searchParam) {
            const filter = {
                $and: [
                    {
                        $or: [
                            { phoneNumber: { $regex: searchParam, $options: "i" } },
                            { name: { $regex: searchParam, $options: "i" } },
                            { bowserId: { $regex: searchParam, $options: "i" } },
                        ],
                    },
                    { roles: '6710ddc21e5c7dc410e64e34' },
                    { verified: true },
                ]
            };
            const users = await User.find(filter, { phoneNumber: 1, name: 1, bowserId: 1, _id: 0, roles: 1, department: 1 }).populate(['roles', 'department']).lean();
            if (users.length === 0) {
                return res.status(404).json({
                    title: "Error",
                    message: "No User found by the given parameter"
                });
            }

            return res.status(200).json(users);
        } else {
            const users = await User.find().populate(['roles', 'department']).sort({ generationTime: -1 });
            return res.status(200).json(users);
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: 'Failed to fetch users', details: error });
    }
});

// Update verification status
router.put('/:phoneNo/verify', async (req, res) => {
    const { verified } = req.body;
    try {
        const user = await User.findOneAndUpdate(
            { phoneNumber: req.params.phoneNo },
            { verified },
            { new: true } // Ensure the updated document is returned
        ).populate('roles'); // Populate any referenced fields like roles

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.status(200).json(user); // Send the fully updated user object
    } catch (error) {
        res.status(500).json({ error: 'Failed to update verification status', details: error });
    }
});

// Update or add roles
router.put('/update/roles', async (req, res) => {
    const { roles, phoneNumber } = req.body;
    try {
        const user = await User.findOne({ phoneNumber });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const roleObjectIds = roles.map((role) => new mongoose.Types.ObjectId(role));

        user.roles = roleObjectIds;
        await user.save();

        const updatedUser = await User.findOne({ phoneNumber }).populate(["roles", "department"]);
        if (!updatedUser) return res.status(404).json({ error: "User not found" });
        res.status(200).json(updatedUser);

    } catch (error) {
        console.error('Error updating roles:', error);
        res.status(500).json({ error: 'Failed to update roles', details: error });
    }
});
// update or add department
router.put('/update/department', async (req, res) => {
    const { department, phoneNumber } = req.body;
    console.log(req.body)
    try {
        const user = await User.findOne({ phoneNumber });
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.department = department;
        await user.save();

        const updatedUser = await User.findOne({ phoneNumber }).populate(["roles", "department"]);
        if (!updatedUser) return res.status(404).json({ error: "User not found" });
        res.status(200).json(updatedUser);

    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update department', details: error });
    }
});

// Delete a user
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findOneAndDelete({ userId: req.params.id });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ message: 'User deleted', user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user', details: error });
    }
});

router.get('/un-authorized-logins', async (req, res) => {
    try {
        const unAuthorizedLogins = await UnAuthorizedLogin.find().sort({ timestamp: -1 }).exec();
        if (!unAuthorizedLogins || unAuthorizedLogins.length < 1) {
            return res.status(404).json({ message: 'No Un Authorized logins found' });
        } else {
            return res.status(200).json(unAuthorizedLogins);
        }
    } catch (error) {
        console.error('Error', error);
        return res.status(500).json({ message: `An error occured`, error: error.message });
    }
})

router.patch('/update-device', async (req, res) => {
    const { phoneNumber, newDeviceUUID } = req.body;

    try {
        const user = await User.findOne({ phoneNumber });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.deviceUUID = newDeviceUUID;
        await user.save();

        return res.status(200).json({ message: 'Device UUID updated successfully' });
    } catch (error) {
        console.error('Error updating device UUID:', error);
        return res.status(500).json({ message: 'An error occurred while updating device UUID', error: error.message });
    }
});

router.delete('/un-authorized-request/:id', async (req, res) => {
    try {
        let requestId = req.params.id
        const anAuthorizedDoc = await UnAuthorizedLogin.findByIdAndDelete(requestId);
        if (!anAuthorizedDoc) return res.status(404).json({ message: "Invalid id or document not found" })
        res.status(200).json({ message: "Requested un authorized data delted successfully" })
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete requested un authorized datauser', details: error });
    }
})

router.put('/update', async (req, res) => {
    const { userId, name, phoneNumber } = req.body;

    try {
        const updatedUser = await User.findOneAndUpdate(
            { userId },
            { name, phoneNumber },
            { new: true, select: 'name phoneNumber' }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User updated successfully', user: { name: updatedUser.name, phoneNumber: updatedUser.phoneNumber } });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
});

module.exports = router;
