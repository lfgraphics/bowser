const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const argon2 = require('argon2');
const Role = require('../models/role');

router.post('/signup', async (req, res) => {
    try {
        const { userId, password, phoneNumber, name } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ userId });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await argon2.hash(password);

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
        const token = jwt.sign({ userId: newUser.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

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
        console.log(req.body)
        // 1. Find user and check validity
        const user = await User.findOne({ userId }).populate('roles');
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await argon2.verify(user.password, password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 2. Check if user has access to the requested app
        const hasAccess = user.roles.some(async role => {
            const roleDoc = await Role.findById(role);
            return roleDoc.permissions.apps.some(app =>
                app.name === appName && app.access === 'admin'
            );
        });

        if (!hasAccess) {
            return res.status(403).json({ message: 'User does not have access to this application' });
        }

        // 3. Gather the user's roles for the token payload
        let roleNames = [];
        let roles = [];
        if (user.roles && user.roles.length > 0) {
            roles = await Role.find({ _id: { $in: user.roles } });
            roleNames = roles.map(role => role.name);
        }

        // 4. Create the JWT
        const token = jwt.sign(
            { userId: user.userId, roles: roleNames.map(r => r.toString()) },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 5. Set the token in an HTTP-only, secure cookie
        //    Adjust cookie options according to your environment
        res.cookie('token', token, {
            httpOnly: true,           // prevents JS from reading the cookie
            // secure: process.env.NODE_ENV === 'production', // only send over HTTPS in prod
            // sameSite: 'strict',       // helps mitigate CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            path: '/' // typically default
        });

        // 6. Return JSON (without the raw token, if you want to rely solely on the cookie)
        return res.json({
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                userId: user.userId,
                name: user.name,
                phoneNumber: user.phoneNumber,
                roles: roleNames,
                verified: user.verified
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});


module.exports = router;
