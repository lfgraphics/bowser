const express = require('express');
// const mongoose = require('mongoose');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Driver = require('../models/driver');
const UnAuthorizedLogin = require('../models/unauthorizedLogin');
const argon2 = require('argon2');
// const Role = require('../models/role');
const moment = require('moment-timezone');
const vehicle = require('../models/vehicle');

router.post('/signup', async (req, res) => {
    try {
        const { password, phoneNumber, name, deviceUUID } = req.body;

        const driver = await Driver.find({ Name: { $regex: name, $options: 'i' } });

        if (driver.length > 1) {
            console.error(`Multiple Ids found by ${name}`);
            return res.status(400).json({ message: `Please specify the id properly. We found ${driver.length} Ids by ${name}` });
        }

        if (driver[0].password) {
            console.error(`User already exist`);
            console.log('driver:', driver[0].Name);
            return res.status(400).json({ message: `User already existn\nContact admin if you want to update the password.` });
        }

        if (!driver) {
            console.error(`No data found with the entered Id ${name}`);
            return res.status(404).json({ message: `No data found with the entered Id ${name}` });
        }

        const idMatch = driver[0].Name.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
        let cleanName = driver[0].Name.trim();
        let recognizedId = '';
        if (idMatch) {
            recognizedId = idMatch[0].replace(/[()]/g, '').toUpperCase();
            cleanName = cleanName.replace(/(?:\s*[-\s]\s*|\s*\(|\)\s*)(?:ITPL-?\d+|\(ITPL-?\d+\))/i, '').trim();
        }

        let id = recognizedId || cleanName;

        const hashedPassword = await argon2.hash(password);

        const updatedDriver = await Driver.findOneAndUpdate(
            { Name: { $regex: name, $options: "i" } },
            {
                $set: {
                    "MobileNo.0.MobileNo": phoneNumber,
                    "MobileNo.0.LastUsed": true,
                    ITPLId: id,
                    password: hashedPassword,
                    deviceUUID,
                    verified: true,
                    generationTime: moment().tz("Asia/Kolkata").toDate()
                }
            },
            { new: true, upsert: true }
        );


        const token = jwt.sign({ user: updatedDriver }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ message: `Signup successful your Id is ${id}\nuse phone: ${phoneNumber} and entered password to login`, token, verified: false });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { phoneNumber, password, deviceUUID } = req.body;

        const user = await Driver.findOne({ 'MobileNo.MobileNo': phoneNumber });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isPasswordValid = await argon2.verify(user.password, password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }
        let roleNames = ['Wehicle Driver'];
        // let roles = [];
        // if (user.roles && user.roles.length > 0) {
        //     roles = await Role.find({ _id: { $in: user.roles } });
        //     roleNames = roles.map(role => role.name);
        // }

        // const hasAccess = roles.some(role =>
        //     role.permissions.apps.some(app =>
        //         app.name === appName && app.access !== null
        //     )
        // );

        // if (!hasAccess) {
        //     return res.status(403).json({ message: 'User does not have access to this application' });
        // }

        // if (deviceUUID && (user.deviceUUID !== deviceUUID)) {
        //     const unauthorizedLogin = new UnAuthorizedLogin({
        //         userId: user.ITPLId,
        //         name: user.Name,
        //         phoneNumber: user.MobileNo[0].MobileNo,
        //         registeredDeviceUUID: user.deviceUUID,
        //         attemptedDeviceUUID: deviceUUID,
        //         timestamp: new Date()
        //     });

        //     await unauthorizedLogin.save();
        //     return res.status(403).json({ message: 'You are loggin in from a diffrent device\nContact admin to approve this device' });
        // }

        const token = jwt.sign({ phoneNumber: user.phoneNumber, iat: Date.now() }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const loginTime = new Date().toISOString();

        const idMatch = user.Name.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
        let cleanName = user.Name.trim();
        let recognizedId = '';
        if (idMatch) {
            recognizedId = idMatch[0].replace(/[()]/g, '').toUpperCase() || user.ITPLId;
            cleanName = cleanName.replace(/(?:\s*[-\s]\s*|\s*\(|\)\s*)(?:ITPL-?\d+|\(ITPL-?\d+\))/i, '').trim();
        }

        let driversVehicle = await vehicle.find({ 'tripDetails.driver': { $regex: user.ITPLId } });
        console.log('driversVehicle:', driversVehicle);

        let userData = {
            Name: cleanName,
            Id: user.ITPLId,
            'Phone Number': user.MobileNo[0].MobileNo,
            Role: roleNames,
            VehicleNo: ''
        };

        if (driversVehicle.length == 1) {
            userData.VehicleNo = driversVehicle[0].VehicleNo;
        } else {
            userData.VehicleNo = 'No Vehicle Assigned';
        }

        res.json({
            message: 'Login successful',
            token,
            loginTime,
            verified: user.verified,
            user: userData
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

router.post('/verify-token', async (req, res) => {
    try {
        const { token, deviceUUID } = req.body;

        if (!token) {
            return res.status(401).json({ valid: false, message: 'No token provided' });
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ valid: false, message: 'Invalid token' });
            }

            if (!isTokenValid(decoded)) {
                return res.status(401).json({ valid: false, message: 'Token expired' });
            }
            const user = await Driver.findOne({ 'MobileNo.MobileNo': decoded.phoneNumber });

            if (!user) {
                return res.status(404).json({ valid: false, message: 'User not found' });
            }

            if (user.deviceUUID !== deviceUUID) {
                const unauthorizedLogin = new UnAuthorizedLogin({
                    userId: user.ITPLId,
                    name: user.Name,
                    phoneNumber: user.MobileNo[0].MobileNo,
                    registeredDeviceUUID: user.deviceUUID,
                    attemptedDeviceUUID: deviceUUID,
                    timestamp: new Date()
                });

                await unauthorizedLogin.save();

                return res.status(403).json({
                    valid: false,
                    message: `Unauthorized device\nLogin Details sent to Admin`,
                    unauthorizedAttempt: true
                });
            }

            res.json({ valid: true, userId: decoded.userId });
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ valid: false, message: 'Internal server error', error: error.message });
    }
});

router.post('/generate-reset-url', async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = generateResetToken();
        const expiryTime = Date.now() + 3600000; // 1 hour from now

        user.resetToken = resetToken;
        user.resetTokenExpiry = expiryTime;

        try {
            await user.save();
        } catch (error) {
            console.error('Error saving user:', error);
        }

        const resetUrl = `https://itpl-bowser-admin.vercel.app/reset-password?token=${resetToken}&userId=${userId}`;
        res.json({ resetUrl });
    } catch (error) {
        console.error('Error generating reset URL:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.patch('/reset-password', async (req, res) => {
    const { userId, token, password, confirmPassword } = req.body;
    try {
        const user = await User.findOne({ userId });
        if (!user || user.resetToken !== token || user.resetTokenExpiry < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Hash the new password
        user.password = await argon2.hash(password);
        user.resetToken = undefined; // Clear the reset token
        user.resetTokenExpiry = undefined; // Clear the expiry time
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;