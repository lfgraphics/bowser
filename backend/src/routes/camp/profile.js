import { Router } from 'express';
import { findById as findCampUserById, findByIdAndUpdate } from '../../models/CampUsers.js';
import argon2Pkg from 'argon2';
const { verify: verifyPassword, hash } = argon2Pkg;
import { verifyCampUserToken } from '../../middleware/auth.js';

const router = Router();

// Get current user profile
router.get('/profile', verifyCampUserToken, async (req, res) => {
    try {
        // User is already fetched by middleware, just exclude password
        const { password, ...userWithoutPassword } = req.user.toObject();
        res.json(userWithoutPassword);
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

        const user = await findByIdAndUpdate(
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

        // Return updated user without password (user object is already updated)
        const { password, ...userWithoutPassword } = user.toObject();
        res.json({
            user: userWithoutPassword,
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
        const isCurrentPasswordValid = await verifyPassword(user.password, currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }

        // Hash new password
        const hashedNewPassword = await hash(newPassword);
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
        // User is already available from middleware
        res.json({ locations: req.user.locations || [] });
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

export default router;