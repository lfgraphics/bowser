const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const CampUser = require('../../models/CampUsers');
const argon2 = require('argon2');

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Check if user is admin or trans app admin
const checkAdminAccess = async (req, res, next) => {
    try {
        const { user } = req;

        // Check if it's a camp admin
        if (user.type === 'camp') {
            const campUser = await CampUser.findById(user.userId);
            if (campUser && campUser.role === 'admin') {
                req.isCampAdmin = true;
                return next();
            }
        }

        // Check if it's a trans app admin (would need to check trans app user model)
        // For now, we'll assume trans app users with admin role are allowed
        if (user.type === 'transapp' || !user.type) {
            // This would need to be validated against trans app user model
            req.isTransAppAdmin = true;
            return next();
        }

        return res.status(403).json({ message: 'Admin access required' });
    } catch (error) {
        console.error('Admin access check error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all camp users (paginated)
router.get('/users', verifyAdminToken, checkAdminAccess, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const role = req.query.role || '';

        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) {
            searchQuery.status = status;
        }
        if (role) {
            searchQuery.role = role;
        }

        const users = await CampUser.find(searchQuery)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await CampUser.countDocuments(searchQuery);
        const totalPages = Math.ceil(total / limit);

        res.json({
            users,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Get camp users error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get single camp user
router.get('/users/:id', verifyAdminToken, checkAdminAccess, async (req, res) => {
    try {
        const user = await CampUser.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get camp user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update camp user
router.put('/users/:id', verifyAdminToken, checkAdminAccess, async (req, res) => {
    try {
        const { name, email, phone, role, status, locations } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (role) updateData.role = role;
        if (status) updateData.status = status;
        if (locations) updateData.locations = locations;

        const user = await CampUser.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user, message: 'User updated successfully' });
    } catch (error) {
        console.error('Update camp user error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email or phone already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update user configs
router.put('/users/:id/configs', verifyAdminToken, checkAdminAccess, async (req, res) => {
    try {
        const { configs } = req.body;

        const user = await CampUser.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update configs with readonly flag handling
        for (const [key, value] of Object.entries(configs)) {
            // Ensure readonly flag is preserved if not explicitly set
            if (typeof value === 'object' && value !== null) {
                const existingConfig = user.configs.get(key);
                const updatedConfig = {
                    ...value,
                    // Preserve or set readonly flag (default to false if not specified)
                    readonly: value.hasOwnProperty('readonly') ? value.readonly : (existingConfig?.readonly || false)
                };
                user.configs.set(key, updatedConfig);
            } else {
                user.configs.set(key, value);
            }
        }

        await user.save();

        res.json({
            user: await CampUser.findById(req.params.id).select('-password'),
            message: 'User configs updated successfully'
        });
    } catch (error) {
        console.error('Update user configs error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete camp user
router.delete('/users/:id', verifyAdminToken, checkAdminAccess, async (req, res) => {
    try {
        const user = await CampUser.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete camp user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reset user password
router.post('/users/:id/reset-password', verifyAdminToken, checkAdminAccess, async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const hashedPassword = await argon2.hash(newPassword);

        const user = await CampUser.findByIdAndUpdate(
            req.params.id,
            {
                password: hashedPassword,
                loginAttempts: 0,
                accountLocked: false,
                lockUntil: undefined
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Verify/Approve camp user
router.post('/users/:id/verify', verifyAdminToken, checkAdminAccess, async (req, res) => {
    try {
        const user = await CampUser.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user, message: 'User verified successfully' });
    } catch (error) {
        console.error('Verify user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Suspend camp user
router.post('/users/:id/suspend', verifyAdminToken, checkAdminAccess, async (req, res) => {
    try {
        const user = await CampUser.findByIdAndUpdate(
            req.params.id,
            { status: 'suspended' },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user, message: 'User suspended successfully' });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get dashboard stats
router.get('/dashboard/stats', verifyAdminToken, checkAdminAccess, async (req, res) => {
    try {
        const totalUsers = await CampUser.countDocuments();
        const activeUsers = await CampUser.countDocuments({ status: 'active' });
        const inactiveUsers = await CampUser.countDocuments({ status: 'inactive' });
        const suspendedUsers = await CampUser.countDocuments({ status: 'suspended' });

        const usersByRole = await CampUser.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        const recentUsers = await CampUser.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            stats: {
                total: totalUsers,
                active: activeUsers,
                inactive: inactiveUsers,
                suspended: suspendedUsers,
                byRole: usersByRole
            },
            recentUsers
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Bulk seed camp users
router.post('/seed-users', verifyAdminToken, checkAdminAccess, async (req, res) => {
    try {
        const { users } = req.body;

        if (!users || !Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: 'Users array is required and must not be empty' });
        }

        // Validate and format user data
        const formattedUsers = [];
        const errors = [];
        const phoneNumbers = new Set(); // To track duplicates in the batch

        for (let i = 0; i < users.length; i++) {
            const user = users[i];

            // Validate required fields
            if (!user.name || !user.phone || !user.password) {
                errors.push(`User at index ${i}: Name, phone, and password are required`);
                continue;
            }

            // Format phone number based on length
            let formattedPhone = user.phone.toString().trim();

            if (formattedPhone.length === 1) {
                formattedPhone = '964893820' + formattedPhone;
            } else if (formattedPhone.length === 2) {
                formattedPhone = '96489382' + formattedPhone;
            }
            // If length is already more than 2, keep as is

            // Check for duplicate phone numbers in the batch
            if (phoneNumbers.has(formattedPhone)) {
                errors.push(`User at index ${i}: Duplicate phone number ${formattedPhone} in the batch`);
                continue;
            }
            phoneNumbers.add(formattedPhone);

            // Hash password
            let hashedPassword;
            try {
                hashedPassword = await argon2.hash(user.password);
            } catch (hashError) {
                errors.push(`User at index ${i}: Error hashing password`);
                continue;
            }

            // Format locations (ensure it's an array)
            let locations = [];
            if (user.locations) {
                if (typeof user.locations === 'string') {
                    locations = user.locations.split(',').map(loc => loc.trim()).filter(loc => loc);
                } else if (Array.isArray(user.locations)) {
                    locations = user.locations.map(loc => loc.toString().trim()).filter(loc => loc);
                }
            }

            // Add formatted user
            const userDoc = {
                name: user.name.trim(),
                phone: formattedPhone,
                password: hashedPassword,
                locations: locations,
                role: user.role && ['admin', 'officer', 'supervisor'].includes(user.role) ? user.role : 'officer',
                status: user.status && ['active', 'inactive', 'suspended'].includes(user.status) ? user.status : 'active'
            };

            // Only add email if it's provided and not empty
            if (user.email && user.email.trim()) {
                userDoc.email = user.email.trim().toLowerCase();
            }

            formattedUsers.push(userDoc);
        }

        // If there are validation errors, return them
        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Validation errors found',
                errors: errors,
                processedCount: 0,
                totalCount: users.length
            });
        }

        // Check for existing phone numbers in database
        const existingPhones = await CampUser.find({
            phone: { $in: Array.from(phoneNumbers) }
        }).select('phone');

        if (existingPhones.length > 0) {
            const existingPhoneNumbers = existingPhones.map(user => user.phone);
            return res.status(400).json({
                message: 'Some phone numbers already exist in the database',
                existingPhones: existingPhoneNumbers,
                processedCount: 0,
                totalCount: users.length
            });
        }

        // Bulk insert users
        const insertedUsers = await CampUser.insertMany(formattedUsers, {
            ordered: false, // Continue inserting even if some fail
            lean: true
        });

        res.status(201).json({
            message: `Successfully seeded ${insertedUsers.length} camp users`,
            processedCount: insertedUsers.length,
            totalCount: users.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Bulk seed users error:', error);

        // Handle duplicate key errors from MongoDB
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern || {})[0];
            const duplicateValue = error.keyValue ? error.keyValue[duplicateField] : 'unknown';

            return res.status(400).json({
                message: `Duplicate ${duplicateField}: ${duplicateValue}`,
                processedCount: 0,
                totalCount: req.body.users ? req.body.users.length : 0
            });
        }

        res.status(500).json({
            message: 'Internal server error during bulk seeding',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;