const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Role = require('../models/role');
const { TripSheet } = require('../models/TripSheets');
const UnAuthorizedLogin = require('../models/unauthorizedLogin');
const argon2 = require('argon2');
const crypto = require('crypto');


function isTokenValid(decodedToken) {
    const now = Date.now();
    const tokenIssueTime = decodedToken.iat * 1000; // Convert to milliseconds
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    return now - tokenIssueTime < sevenDaysInMs;
}

const generateResetToken = () => {
    return crypto.randomBytes(10).toString('hex');
};

router.post('/signup', async (req, res) => {
    try {
        const { password, phoneNumber, name, deviceUUID } = req.body;

        // Check if user already exists
        if (phoneNumber) {
            const existingUser = await User.findOne({ phoneNumber });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
        }

        // Hash the password
        const hashedPassword = await argon2.hash(password);

        // Create new user
        const newUser = new User({
            password: hashedPassword,
            phoneNumber,
            name,
            deviceUUID,
            verified: false
        });

        await newUser.save();

        // Create and send JWT token
        const token = jwt.sign({ phoneNo: newUser.phoneNumber }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ message: 'User created successfully', token, verified: false });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { phoneNumber, password, deviceUUID, appName } = req.body;

        const user = await User.findOne({ phoneNumber });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isPasswordValid = await argon2.verify(user.password, password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }
        let roleNames = [];
        let roles = [];
        if (user.roles && user.roles.length > 0) {
            roles = await Role.find({ _id: { $in: user.roles } });
            roleNames = roles.map(role => role.name);
        }

        const hasAccess = roles.some(role =>
            role.permissions.apps.some(app =>
                app.name === appName && app.access !== null
            )
        );

        if (!hasAccess) {
            return res.status(403).json({ message: 'User does not have access to this application' });
        }

        if (deviceUUID && (user.deviceUUID !== deviceUUID)) {
            const unauthorizedLogin = new UnAuthorizedLogin({
                userId: user.userId,
                name: user.name,
                phoneNumber: user.phoneNumber,
                registeredDeviceUUID: user.deviceUUID,
                attemptedDeviceUUID: deviceUUID,
                timestamp: new Date()
            });

            await unauthorizedLogin.save();
            return res.status(403).json({ message: 'You are loggin in from a diffrent device\nContact admin to approve this device' });
        }

        const token = jwt.sign({ phoneNumber: user.phoneNumber, iat: Date.now() }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const loginTime = new Date().toISOString();

        const userTripSheets = await TripSheet.find({
            'bowser.driver.phoneNo': user.phoneNumber,
            $or: [
                { 'settelment.settled': { $exists: false } },
                { 'settelment.settled': false }
            ]
        }).select('tripSheetId');

        if (userTripSheets.length === 0) {
            return res.status(404).json({ message: "No unsettled trip sheet found for you \nCan't login" });
        }

        const userTripSheetId = userTripSheets[0].tripSheetId;

        const userData = {
            'Name': user.name,
            'Phone Number': user.phoneNumber,
            'Verified User': user.verified,
            'Role': roleNames,
            'Bowser': user.bowserId,
            'Trip Sheet Id': userTripSheetId || "Not on a trip",
        };

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
            const user = await User.findOne({ phoneNumber: decoded.phoneNumber });

            if (!user) {
                return res.status(404).json({ valid: false, message: 'User not found' });
            }

            if (user.deviceUUID !== deviceUUID) {
                const unauthorizedLogin = new UnAuthorizedLogin({
                    userId: user.userId,
                    name: user.name,
                    phoneNumber: user.phoneNumber,
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

router.post('/get-push-token', async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ token: user.pushToken });
    } catch (error) {
        console.error('Error fetching push token:', error);
        res.status(500).json({ message: 'Internal server error' });
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
