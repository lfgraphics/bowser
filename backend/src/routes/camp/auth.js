const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const CampUser = require('../../models/CampUsers');
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

// Camp User Signup
router.post('/signup', async (req, res) => {
    try {
        const { userId, password, name, phone, email } = req.body;

        // Check if user already exists
        const existingUserByPhone = await CampUser.findOne({ phone });
        if (existingUserByPhone) {
            return res.status(400).json({ message: 'User with this phone number already exists' });
        }

        if (email) {
            const existingUserByEmail = await CampUser.findOne({ email });
            if (existingUserByEmail) {
                return res.status(400).json({ message: 'User with this email already exists' });
            }
        }

        // Hash the password
        const hashedPassword = await argon2.hash(password);

        // Create new camp user
        const newUser = new CampUser({
            name,
            email,
            phone,
            password: hashedPassword,
            role: 'officer', // Default role
            status: 'inactive' // Requires admin approval
        });

        await newUser.save();

        // Create and send JWT token
        const token = jwt.sign(
            { 
                userId: newUser._id, 
                phone: newUser.phone,
                type: 'camp' 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                status: newUser.status,
                roles: [newUser.role],
                type: 'camp'
            },
            message: 'Camp user account created successfully. Please wait for admin approval.'
        });
    } catch (error) {
        console.error('Camp signup error:', error);
        res.status(500).json({ message: 'Internal server error during signup' });
    }
});

// Camp User Login
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;

        // Find user by phone (using userId as phone for camp users)
        const user = await CampUser.findOne({ 
            $or: [
                { phone: userId },
                { email: userId }
            ]
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if account is locked
        if (user.isLocked) {
            return res.status(423).json({ 
                message: 'Account is locked. Please try again later.' 
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(403).json({ 
                message: 'Account is not active. Please contact admin for approval.' 
            });
        }

        // Verify password
        const isPasswordValid = await argon2.verify(user.password, password);
        if (!isPasswordValid) {
            // Increment login attempts
            user.loginAttempts += 1;
            
            // Lock account after 5 failed attempts
            if (user.loginAttempts >= 5) {
                user.accountLocked = true;
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
            }
            
            await user.save();
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Reset login attempts on successful login
        if (user.loginAttempts > 0) {
            user.loginAttempts = 0;
            user.accountLocked = false;
            user.lockUntil = undefined;
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Create JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                phone: user.phone,
                type: 'camp'
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
                roles: [user.role],
                locations: user.locations,
                type: 'camp'
            },
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Camp login error:', error);
        res.status(500).json({ message: 'Internal server error during login' });
    }
});

// Verify Token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!isTokenValid(decoded) || decoded.type !== 'camp') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        const user = await CampUser.findById(decoded.userId);
        if (!user || user.status !== 'active') {
            return res.status(401).json({ message: 'User not found or inactive' });
        }

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
                roles: [user.role],
                locations: user.locations,
                type: 'camp'
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Change Password
router.post('/change-password', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const { currentPassword, newPassword } = req.body;

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!isTokenValid(decoded) || decoded.type !== 'camp') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        const user = await CampUser.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isCurrentPasswordValid = await argon2.verify(user.password, currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedNewPassword = await argon2.hash(newPassword);
        user.password = hashedNewPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Password Reset Request
router.post('/reset-password-request', async (req, res) => {
    try {
        const { phone } = req.body;

        const user = await CampUser.findOne({ phone });
        if (!user) {
            // Don't reveal if user exists or not
            return res.json({ message: 'If the phone number exists, a reset code will be sent.' });
        }

        const resetToken = generateResetToken();
        user.setConfig('passwordResetToken', resetToken);
        user.setConfig('passwordResetExpires', Date.now() + 10 * 60 * 1000); // 10 minutes
        
        await user.save();

        // TODO: Implement SMS sending logic here
        console.log(`Password reset token for ${phone}: ${resetToken}`);

        res.json({ message: 'Password reset code sent to your phone number.' });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { phone, resetToken, newPassword } = req.body;

        const user = await CampUser.findOne({ phone });
        if (!user) {
            return res.status(400).json({ message: 'Invalid reset request' });
        }

        const storedToken = user.getConfig('passwordResetToken');
        const tokenExpires = user.getConfig('passwordResetExpires');

        if (!storedToken || storedToken !== resetToken) {
            return res.status(400).json({ message: 'Invalid reset token' });
        }

        if (!tokenExpires || Date.now() > tokenExpires) {
            return res.status(400).json({ message: 'Reset token has expired' });
        }

        // Hash new password
        const hashedPassword = await argon2.hash(newPassword);
        user.password = hashedPassword;
        
        // Clear reset token
        user.configs.delete('passwordResetToken');
        user.configs.delete('passwordResetExpires');
        
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;