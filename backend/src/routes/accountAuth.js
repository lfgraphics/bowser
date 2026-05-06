import { Router } from 'express';
import jwtPkg from 'jsonwebtoken';
const { sign, verify } = jwtPkg;
import AccountUser from '../models/AccountUser.js';
import argon2Pkg from 'argon2';
const { hash, verify: verifyPassword } = argon2Pkg;
import { randomBytes } from 'crypto';
import { verifyAdmin, verifyUser } from './accounts/utils.js';

const router = Router();

// Refresh token expiry: 30 days
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000;
// Access token expiry: 1 hour
const ACCESS_TOKEN_EXPIRY = '1h';

/**
 * POST /api/account-auth/login
 * Login for account users (cashier, GR manager, accountant, admin)
 */
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ message: 'User ID and password are required' });
        }

        // Find user with password field
        const user = await AccountUser.findOne({ $or: [{ userId: userId.toLowerCase() }, { email: userId.toLowerCase() }] })
            .select('+password +refreshToken +refreshTokenExpiry');

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is inactive. Please contact administrator.' });
        }

        // Check if account is locked
        if (user.isLocked()) {
            return res.status(403).json({
                message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
                lockUntil: user.lockUntil
            });
        }

        // Check if temp cashier account is expired
        if (user.role === 'tempCashier' && user.validTill && user.validTill < new Date()) {
            return res.status(403).json({ message: 'Temporary account has expired' });
        }

        // Verify password
        const isPasswordValid = await verifyPassword(user.password, password);

        if (!isPasswordValid) {
            // Increment failed login attempts
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

            // Lock account after 5 failed attempts for 15 minutes
            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
            }

            await user.save();
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate tokens
        const accessToken = sign(
            {
                userId: user.userId,
                id: user._id.toString(),
                role: user.role,
                permissions: user.permissions || []
            },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        const refreshToken = randomBytes(64).toString('hex');
        const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

        // Update user
        user.lastLogin = new Date();
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        user.refreshToken = refreshToken;
        user.refreshTokenExpiry = refreshTokenExpiry;
        await user.save();

        // Send response
        res.json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            refreshTokenExpiry: refreshTokenExpiry.getTime(),
            forcePasswordChange: user.forcePasswordChange || false,
            user: {
                id: user._id,
                userId: user.userId,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions || [],
            }
        });
    } catch (error) {
        console.error('Account login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/account-auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        // Find user with this refresh token
        const user = await AccountUser.findOne({ refreshToken })
            .select('+refreshToken +refreshTokenExpiry');

        if (!user) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Check if refresh token is expired
        if (!user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
            return res.status(401).json({ message: 'Refresh token expired' });
        }

        // Check if account is still active
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is inactive' });
        }

        // Generate new access token
        const accessToken = sign(
            {
                userId: user.userId,
                id: user._id.toString(),
                role: user.role,
                permissions: user.permissions || []
            },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        // Generate new refresh token if current one expires in less than 7 days
        const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        let newRefreshToken = refreshToken;
        let newRefreshTokenExpiry = user.refreshTokenExpiry;

        if (user.refreshTokenExpiry < sevenDaysFromNow) {
            newRefreshToken = randomBytes(64).toString('hex');
            newRefreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

            user.refreshToken = newRefreshToken;
            user.refreshTokenExpiry = newRefreshTokenExpiry;
            user.lastLogin = new Date();
            await user.save();
        }

        res.json({
            message: 'Token refreshed successfully',
            accessToken,
            refreshToken: newRefreshToken,
            refreshTokenExpiry: newRefreshTokenExpiry.getTime(),
            forcePasswordChange: user.forcePasswordChange || false,
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/account-auth/logout
 * Logout and invalidate refresh token
 */
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Find and clear the refresh token
            const user = await AccountUser.findOne({ refreshToken });
            if (user) {
                user.refreshToken = undefined;
                user.refreshTokenExpiry = undefined;
                await user.save();
            }
        }

        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/account-auth/verify
 * Verify access token and return user info
 */
router.post('/verify', async (req, res) => {
    try {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({ valid: false, message: 'Access token is required' });
        }

        verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ valid: false, message: 'Invalid or expired token' });
            }

            // Verify user still exists and is active
            const user = await AccountUser.findById(decoded.id);

            if (!user || !user.isActive) {
                return res.status(401).json({ valid: false, message: 'User not found or inactive' });
            }

            res.json({
                valid: true,
                user: {
                    id: user._id,
                    userId: user.userId,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions || [],
                }
            });
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ valid: false, message: 'Internal server error' });
    }
});

/**
 * GET /api/account-auth/dashboard-route
 * Get the appropriate dashboard route for a user's role
 */
router.get('/dashboard-route/:role', (req, res) => {
    const { role } = req.params;

    const dashboardRoutes = {
        cashierAdmin: '/cashier',
        tempCashier: '/cashier',
        grManager: '/gr',
        accountant: '/accounts',
        admin: '/admin',
    };

    const route = dashboardRoutes[role] || '/';
    res.json({ dashboardRoute: route });
});

/**
 * POST /api/account-auth/seed-admin
 * Create initial admin user (prevents re-seeding)
 */
router.post('/seed-admin', async (req, res) => {
    try {
        // Check if any admin already exists
        const existingAdmin = await AccountUser.findOne({ role: 'admin' });

        if (existingAdmin) {
            return res.status(400).json({
                message: 'Admin user already exists. Seeding prevented.',
                seeded: false
            });
        }

        // Create initial admin with Admin:123
        const hashedPassword = await hash('123');

        const adminUser = new AccountUser({
            userId: 'admin',
            name: 'System Administrator',
            password: hashedPassword,
            role: 'admin',
            permissions: ['*'], // All permissions
            isActive: true,
            forcePasswordChange: true, // Force password change on first login
        });

        await adminUser.save();

        res.status(201).json({
            message: 'Admin user created successfully. Please login with userId: "admin" and password: "123"',
            seeded: true,
            userId: 'admin'
        });
    } catch (error) {
        console.error('Seed admin error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * POST /api/account-auth/force-all-reset
 * Force password change for all existing users (admin only or via direct call for migration)
 */
router.post('/force-all-reset', async (req, res) => {
    try {
        // This is a one-time migration/force action
        const result = await AccountUser.updateMany(
            {},
            { $set: { forcePasswordChange: true } }
        );

        res.json({
            message: `Force password change flag set for ${result.modifiedCount} users.`,
            success: true
        });
    } catch (error) {
        console.error('Force all reset error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/account-auth/forgot-password
 * Request password reset token
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { userId, email } = req.body;

        if (!userId && !email) {
            return res.status(400).json({ message: 'User ID or email is required' });
        }

        // Find user by userId or email
        const query = userId ? { userId: userId.toLowerCase() } : { email: email.toLowerCase() };
        const user = await AccountUser.findOne(query);

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({
                message: 'If the account exists, a password reset token has been generated.',
                success: true
            });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is inactive' });
        }

        // Generate reset token (6-digit code for simplicity)
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // Construct Reset Link
        const frontendUrl = req.headers.origin || 'http://localhost:3001';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&userId=${user.userId}`;

        // In production, call app script to send email
        // For now, log the link and return success
        console.log('----------------------------------------');
        console.log('PASSWORD RESET LINK (Simulated Email):');
        console.log(resetLink);
        console.log('----------------------------------------');

        res.json({
            message: 'If the account exists, a password reset link has been sent to your email.',
            success: true,
            // Only return link in dev mode for testing convenience
            devLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/account-auth/reset-password
 * Reset password using reset token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { userId, resetToken, newPassword } = req.body;

        if (!userId || !resetToken || !newPassword) {
            return res.status(400).json({ message: 'User ID, reset token, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Find user with valid reset token
        const user = await AccountUser.findOne({
            userId: userId.toLowerCase()
        }).select('+resetToken +resetTokenExpiry');

        if (!user || user.resetToken !== resetToken) {
            return res.status(400).json({ message: 'Invalid reset token' });
        }

        if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            return res.status(400).json({ message: 'Reset token has expired' });
        }

        // Hash new password and update user
        const hashedPassword = await hash(newPassword);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        user.forcePasswordChange = false; // Clear force password change flag
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        res.json({ message: 'Password reset successful. You can now login with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/account-auth/change-password
 * Change password (requires current password or force change)
 */
router.post('/change-password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (!userId || !newPassword) {
            return res.status(400).json({ message: 'User ID and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const user = await AccountUser.findOne({ userId: userId.toLowerCase() })
            .select('+password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If not forced password change, verify current password
        if (!user.forcePasswordChange) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required' });
            }

            const isPasswordValid = await verifyPassword(user.password, currentPassword);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
        }

        // Hash and update password
        const hashedPassword = await hash(newPassword);
        user.password = hashedPassword;
        user.forcePasswordChange = false;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * GET /api/account-auth/users
 * Get all users (admin only)
 */
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        const query = { userId: { $ne: 'admin' } };

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { userId: searchRegex },
                { email: searchRegex }
            ];
        }

        // execute query with pagination
        const users = await AccountUser.find(query)
            .select('-password -refreshToken -refreshTokenExpiry -resetToken -resetTokenExpiry')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalUsers = await AccountUser.countDocuments(query);

        res.json({
            users,
            pagination: {
                totalUsers,
                totalPages: Math.ceil(totalUsers / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * GET /api/account-auth/users/:id
 * Get single user by ID (admin only)
 */
router.get('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const user = await AccountUser.findById(req.params.id)
            .select('-password -refreshToken -refreshTokenExpiry -resetToken -resetTokenExpiry');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.userId === 'admin') {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/account-auth/users
 * Create new user (admin only)
 */
router.post('/users', verifyAdmin, async (req, res) => {
    try {
        const { userId, name, email, password, role, permissions, validTill } = req.body;

        if (!userId || !name || !password || !role) {
            return res.status(400).json({ message: 'User ID, name, password, and role are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if userId already exists
        const existingUser = await AccountUser.findOne({ userId: userId.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User ID already exists' });
        }

        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = await AccountUser.findOne({ email: email.toLowerCase() });
            if (existingEmail) {
                return res.status(400).json({ message: 'Email already exists' });
            }
        }

        // Validate role
        const validRoles = ['cashierAdmin', 'tempCashier', 'grManager', 'accountant', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Validate validTill for tempCashier
        if (role === 'tempCashier' && !validTill) {
            return res.status(400).json({ message: 'validTill is required for temporary cashiers' });
        }

        const hashedPassword = await hash(password);

        const newUser = new AccountUser({
            userId: userId.toLowerCase(),
            name,
            email: email ? email.toLowerCase() : undefined,
            password: hashedPassword,
            role,
            permissions: permissions || [],
            validTill: validTill ? new Date(validTill) : undefined,
            isActive: true,
            forcePasswordChange: true, // Force password change on first login
            createdBy: req.user.id,
        });

        await newUser.save();

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser._id,
                userId: newUser.userId,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                permissions: newUser.permissions,
                isActive: newUser.isActive,
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * PUT /api/account-auth/users/:id
 * Update user (admin only)
 */
router.put('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const { name, email, role, permissions, isActive, validTill } = req.body;

        const user = await AccountUser.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.userId === 'admin') {
            return res.status(400).json({ message: 'System admin cannot be modified' });
        }

        // Update fields
        if (name) user.name = name;
        if (email) user.email = email.toLowerCase();
        if (role) {
            const validRoles = ['cashierAdmin', 'tempCashier', 'grManager', 'accountant', 'admin'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }
            user.role = role;
        }
        if (permissions !== undefined) user.permissions = permissions;
        if (isActive !== undefined) user.isActive = isActive;
        if (validTill) user.validTill = new Date(validTill);

        await user.save();

        res.json({
            message: 'User updated successfully',
            user: {
                id: user._id,
                userId: user.userId,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
                isActive: user.isActive,
                validTill: user.validTill,
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * DELETE /api/account-auth/users/:id
 * Delete user (admin only)
 */
router.delete('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const user = await AccountUser.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting the system admin
        if (user.userId === 'admin') {
            return res.status(403).json({ message: 'Cannot delete the system administrator' });
        }

        if (user.role === 'admin') {
            const adminCount = await AccountUser.countDocuments({ role: 'admin', isActive: true });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Cannot delete the last admin user' });
            }
        }

        await AccountUser.findByIdAndDelete(req.params.id);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/profile', verifyUser, async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = req.accountUser;

        if (!name && !email) {
            return res.status(400).json({ message: 'Nothing to update' });
        }

        if (email) {
            const existingEmail = await AccountUser.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
            if (existingEmail) {
                return res.status(400).json({ message: 'Email already exists' });
            }
        }

        if (name) user.name = name;
        if (email !== undefined) user.email = email ? email.toLowerCase() : undefined;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                userId: user.userId,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions || [],
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/account-auth/users/:id/reset-password
 * Admin resets user password (admin only)
 */
router.post('/users/:id/reset-password', verifyAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const user = await AccountUser.findById(req.params.id).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const hashedPassword = await hash(newPassword);
        user.password = hashedPassword;
        user.forcePasswordChange = true; // Force user to change password on next login
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        
        console.log(`[Admin] Resetting password for user: ${user.userId}`);
        await user.save();

        res.json({ message: 'Password reset successfully. User will be prompted to change password on next login.' });
    } catch (error) {
        console.error('Admin reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
