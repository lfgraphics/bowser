import { Router } from 'express';
import jwtPkg from 'jsonwebtoken';
const { sign, verify } = jwtPkg;
import User, { findOne as findUser } from '../models/user.js';
import { find as findRoles } from '../models/role.js';
import { TripSheet } from '../models/TripSheets.js';
import UnAuthorizedLogin from '../models/unauthorizedLogin.js';
import argon2Pkg from 'argon2';
const { hash, verify: verifyPassword } = argon2Pkg;
import { randomBytes } from 'crypto';
import { withTransaction } from '../utils/transactions.js';
import { handleTransactionError, createErrorResponse } from '../utils/errorHandler.js';

const router = Router();

function isTokenValid(decodedToken) {
    const now = Date.now();
    const tokenIssueTime = decodedToken.iat * 1000; // Convert to milliseconds
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    return now - tokenIssueTime < sevenDaysInMs;
}

const generateResetToken = () => {
    return randomBytes(10).toString('hex');
};

router.post('/signup', async (req, res) => {
    try {
        const { password, phoneNumber, name, deviceUUID } = req.body;

        // Pre-transaction validation
        if (!password || !phoneNumber || !name) {
            return res.status(400).json({ message: 'पासवर्ड, फ़ोन नंबर, और नाम की आवश्यकता है|' });
        }

        // Validate phone number format (10 digits)
        if (!/^\d{10}$/.test(phoneNumber)) {
            return res.status(400).json({ message: 'फ़ोन नंबर 10 अंक का होना चाहिए|' });
        }

        // Check if user already exists (before transaction)
        const existingUser = await findUser({ phoneNumber });
        if (existingUser) {
            return res.status(400).json({ message: 'इस फ़ोन नंबर से कोई ड्राइवर पहले से मौजूद है|' });
        }

        // Hash the password
        const hashedPassword = await hash(password);

        // Create new user
        const newUser = new User({
            password: hashedPassword,
            phoneNumber,
            name,
            deviceUUID,
            verified: false
        });

        // Wrap database operations in transaction
        const result = await withTransaction(async (sessions) => {
            await newUser.save({ session: sessions.users });
            return newUser;
        }, { connections: ['users'] });

        // Create and send JWT token (after transaction completes)
        const token = sign({ phoneNo: result.phoneNumber }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ message: 'आप की आई डी बना डी गई', token, verified: false });
    } catch (error) {
        console.error('Signup error:', error);
        const errorResponse = handleTransactionError(error, { route: '/signup', phoneNumber: req.body.phoneNumber });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

router.post('/login', async (req, res) => {
    try {
        const { phoneNumber, password, deviceUUID, appName } = req.body;

        const user = await findUser({ phoneNumber });

        if (!user) {
            return res.status(400).json({ message: 'फ़ोन नंबर मोजूद नहीं या ग़लत फ़ोन नंबर डाला गया है|' });
        }

        const isPasswordValid = await verifyPassword(user.password, password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'पस्वोर्ड ग़लत है|' });
        }
        let roleNames = [];
        let roles = [];
        if (user.roles && user.roles.length > 0) {
            roles = await findRoles({ _id: { $in: user.roles } });
            roleNames = roles.map(role => role.name);
        }

        const hasAccess = roles.some(role =>
            role.permissions.apps.some(app =>
                app.name === appName && app.access !== null
            )
        );

        if (!hasAccess) {
            return res.status(403).json({ message: 'आप को इस एप को इस्तेमाल करने की अनुमति नहीं है|' });
        }

        if (deviceUUID && (user.deviceUUID !== deviceUUID && phoneNumber !== '9648938256')) {
            const unauthorizedLogin = new UnAuthorizedLogin({
                userId: user.userId,
                name: user.name,
                phoneNumber: user.phoneNumber,
                registeredDeviceUUID: user.deviceUUID,
                attemptedDeviceUUID: deviceUUID,
                timestamp: new Date()
            });

            await unauthorizedLogin.save();
            throw new Error('DEVICE_MISMATCH:आप किसी नए फ़ोन से लॉग इन क्र रहे हैं\nइस फ़ोन को अप्रूव करने के लिए एडमिन से बात करें');
        }

        // Wrap database operations in multi-connection transaction
        const result = await withTransaction(async (sessions) => {
            const userTripSheets = await TripSheet.find({
                'bowser.driver.phoneNo': user.phoneNumber,
                $or: [
                    { 'settelment.settled': { $exists: false } },
                    { 'settelment.settled': false }
                ]
            }).select('tripSheetId').session(sessions.bowsers);

            if (userTripSheets.length === 0) {
                throw new Error('NO_TRIP_SHEET:आप के लिए कोई भी ट्रिप शीट नहीं खोली गई है\nलॉग इन नहीं क्र सकते|');
            }

            return {
                userTripSheetId: userTripSheets[0].tripSheetId
            };
        }, { connections: ['users', 'bowsers'] });

        const token = sign({ phoneNumber: user.phoneNumber, iat: Date.now() }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const loginTime = new Date().toISOString();

        const userTripSheetId = result.userTripSheetId;

        const userData = {
            'Name': user.name,
            'Phone Number': user.phoneNumber,
            'Verified User': user.verified,
            'Role': roleNames,
            'Bowser': user.bowserId,
            'Trip Sheet Id': userTripSheetId || "किसी ट्रिप पर नहीं है",
        };

        res.json({
            message: 'लॉग इन सफल हुआ',
            token,
            loginTime,
            verified: user.verified,
            user: userData
        });
    } catch (error) {
        console.error('लॉग इन एरर:', error);
        
        // Handle specific error types
        if (error.message.startsWith('DEVICE_MISMATCH:')) {
            return res.status(403).json({ message: error.message.split(':')[1] });
        }
        if (error.message.startsWith('NO_TRIP_SHEET:')) {
            return res.status(404).json({ message: error.message.split(':')[1] });
        }

        const errorResponse = handleTransactionError(error, { route: '/login', phoneNumber: req.body.phoneNumber });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

router.post('/verify-token', async (req, res) => {
    try {
        const { token, deviceUUID } = req.body;

        if (!token) {
            return res.status(401).json({ valid: false, message: 'No token provided' });
        }

        verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ valid: false, message: 'Invalid token' });
            }

            if (!isTokenValid(decoded)) {
                return res.status(401).json({ valid: false, message: 'Token expired' });
            }
            const user = await findUser({ phoneNumber: decoded.phoneNumber });

            if (!user) {
                return res.status(404).json({ valid: false, message: 'User not found' });
            }

            if (user.deviceUUID !== deviceUUID) {
                try {
                    await withTransaction(async (sessions) => {
                        const unauthorizedLogin = new UnAuthorizedLogin({
                            userId: user.userId,
                            name: user.name,
                            phoneNumber: user.phoneNumber,
                            registeredDeviceUUID: user.deviceUUID,
                            attemptedDeviceUUID: deviceUUID,
                            timestamp: new Date()
                        });

                        await unauthorizedLogin.save({ session: sessions.users });
                    }, { connections: ['users'] });

                    return res.status(403).json({
                        valid: false,
                        message: `Unauthorized device\nLogin Details sent to Admin`,
                        unauthorizedAttempt: true
                    });
                } catch (txnError) {
                    console.error('Transaction error in verify-token:', txnError);
                    const errorResponse = handleTransactionError(txnError, { route: '/verify-token' });
                    return res.status(errorResponse.statusCode).json({ valid: false, ...errorResponse.body });
                }
            }

            res.json({ valid: true, userId: decoded.userId });
        });
    } catch (error) {
        console.error('Token verification error:', error);
        const errorResponse = handleTransactionError(error, { route: '/verify-token' });
        res.status(errorResponse.statusCode).json({ valid: false, ...errorResponse.body });
    }
});

router.post('/get-push-token', async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await findUser({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ token: user.pushToken });
    } catch (error) {
        console.error('Error fetching push token:', error);
        const errorResponse = handleTransactionError(error, { route: '/get-push-token', userId: req.body.userId });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

router.post('/generate-reset-url', async (req, res) => {
    try {
        const { userId } = req.body;

        // Pre-transaction validation
        if (!userId) {
            return res.status(400).json({ message: 'यूज़र आई डी की आवश्यकता है' });
        }

        // Find user before transaction to fail fast
        const user = await findUser({ userId });
        if (!user) {
            return res.status(404).json({ message: 'यूज़र मोजूद नहीं है' });
        }

        const resetToken = generateResetToken();
        const expiryTime = Date.now() + 3600000;

        // Wrap database operations in transaction
        await withTransaction(async (sessions) => {
            user.resetToken = resetToken;
            user.resetTokenExpiry = expiryTime;
            await user.save({ session: sessions.users });
        }, { connections: ['users'] });

        const resetUrl = `https://itpl-bowser-admin.vercel.app/reset-password?token=${resetToken}&userId=${userId}`;
        res.json({ resetUrl });
    } catch (error) {
        console.error('Error generating reset URL:', error);
        const errorResponse = handleTransactionError(error, { route: '/generate-reset-url', userId: req.body.userId });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

router.patch('/reset-password', async (req, res) => {
    try {
        const { userId, token, password, confirmPassword } = req.body;

        // Pre-transaction validation
        if (!userId || !token || !password || !confirmPassword) {
            return res.status(400).json({ message: 'सभी फील्ड की आवश्यकता है' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Find and validate user before transaction
        const user = await findUser({ userId });
        if (!user || user.resetToken !== token || user.resetTokenExpiry < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Hash password
        const hashedPassword = await hash(password);

        // Wrap database operations in transaction
        await withTransaction(async (sessions) => {
            user.password = hashedPassword;
            user.resetToken = undefined;
            user.resetTokenExpiry = undefined;
            await user.save({ session: sessions.users });
        }, { connections: ['users'] });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        const errorResponse = handleTransactionError(error, { route: '/reset-password', userId: req.body.userId });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

export default router;
