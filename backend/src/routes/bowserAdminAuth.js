import { Router } from 'express';
import jwtPkg from 'jsonwebtoken';
const { sign, verify } = jwtPkg;
import User, { findOne as findUser } from '../models/user.js';
import argon2Pkg from 'argon2';
const { hash, verify: verifyPassword } = argon2Pkg;
import { findById as findRoleById, find as findRoles } from '../models/role.js';

const router = Router();

router.post('/signup', async (req, res) => {
    try {
        const { userId, password, phoneNumber, name } = req.body;

        // Check if user already exists
        const existingUser = await findOne({ userId });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await hash(password);

        // Create new admin user
        const newUser = new User({
            userId,
            password: hashedPassword,
            phoneNumber,
            name,
            verified: false
        });

        await newUser.save();

        // Create and send JWT token
        const token = sign({ userId: newUser.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            message: 'Admin user created successfully',
            token,
            user: {
                userId: newUser.userId,
                name: newUser.name,
                phoneNumber: newUser.phoneNumber,
                verified: newUser.verified
            }
        });
    } catch (error) {
        console.error('Admin signup error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { userId, password, appName } = req.body;
        const user = await findOne({ userId }).populate(['roles', 'department']);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await _verify(user.password, password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const hasAccess = user.roles.some(async role => {
            const roleDoc = await findById(role);
            return roleDoc.permissions.apps.some(app =>
                app.name === appName && app.access === 'admin'
            );
        });

        if (!hasAccess) {
            return res.status(403).json({ message: 'User does not have access to this application' });
        }

        let roleNames = [];
        let roles = [];
        if (user.roles && user.roles.length > 0) {
            roles = await find({ _id: { $in: user.roles } });
            roleNames = roles.map(role => role.name);
        }
        let departmentName
        if (user.department) {
            departmentName = user.department.name;
        }

        const token = sign(
            { userId: user.userId, roles: roleNames.map(r => r.toString()) },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.cookie('user_roles', JSON.stringify(roleNames), {
            httpOnly: false,
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });

        return res.json({
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                userId: user.userId,
                name: user.name,
                phoneNumber: user.phoneNumber,
                roles: roleNames,
                department: departmentName,
                verified: user.verified
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

router.post('/verify-token', async (req, res) => {
    const token = req.cookies.token; // Get the token from cookies
   
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const secret = process.env.JWT_SECRET; // Ensure this matches your signing secret
        const decoded = verify(token, secret);

        // Return the roles directly from the decoded token
        const roleNames = decoded.roles || []; // Assuming roles are stored in the token
        res.status(200).json({ roles: roleNames });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ message: 'Failed to verify token', error: error.message });
    }
});

export default router;
