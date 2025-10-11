const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const CampUser = require('../../models/CampUsers');
const argon2 = require('argon2');

// Middleware to verify camp user token
const verifyCampUserToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.type !== 'camp') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        const user = await CampUser.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Get current user profile
router.get('/profile', verifyCampUserToken, async (req, res) => {
    try {
        const user = await CampUser.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update profile (limited fields)
router.put('/profile', verifyCampUserToken, async (req, res) => {
    try {
        const { name, email, locations } = req.body;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (locations && Array.isArray(locations)) updateData.locations = locations;

        const user = await CampUser.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({ user, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update user configs (only non-readonly ones)
router.put('/profile/configs', verifyCampUserToken, async (req, res) => {
    try {
        const { configs } = req.body;
        const user = req.user;

        // Only allow updating configs that are not readonly
        for (const [key, value] of Object.entries(configs)) {
            const existingConfig = user.getConfig(key);
            if (!existingConfig || !existingConfig.readonly) {
                // Ensure readonly property is preserved
                const updatedConfig = { ...value };
                if (existingConfig && existingConfig.readonly !== undefined) {
                    updatedConfig.readonly = existingConfig.readonly;
                }
                user.configs.set(key, updatedConfig);
            }
        }

        await user.save();

        const updatedUser = await CampUser.findById(user._id).select('-password');
        res.json({ 
            user: updatedUser,
            message: 'Profile configs updated successfully' 
        });
    } catch (error) {
        console.error('Update profile configs error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Change password
router.put('/profile/change-password', verifyCampUserToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = req.user;

        // Verify current password
        const isCurrentPasswordValid = await argon2.verify(user.password, currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
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

// Get user locations
router.get('/profile/locations', verifyCampUserToken, async (req, res) => {
    try {
        const user = await CampUser.findById(req.user._id).select('locations');
        res.json({ locations: user.locations || [] });
    } catch (error) {
        console.error('Get locations error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get user activity/stats
router.get('/profile/activity', verifyCampUserToken, async (req, res) => {
    try {
        const user = req.user;
        
        const activity = {
            lastLogin: user.lastLogin,
            accountCreated: user.createdAt,
            accountStatus: user.status,
            role: user.role,
            loginAttempts: user.loginAttempts,
            isLocked: user.isLocked
        };

        res.json(activity);
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;