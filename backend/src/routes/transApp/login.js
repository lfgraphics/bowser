const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const TransUser = require('../../models/TransUser');
const { division } = require('./utils');

router.post('/', async (req, res) => {
    const { userId, password } = req.body;
    console.log("Login attempt with userId:", userId);
    if (!userId || !password) {
        return res.status(400).json({ error: 'User ID and password are required.' });
    }
    const user = await TransUser.findOne({ UserName: { $regex: userId, $options: 'i' }, Password: { $regex: password, $options: 'i' } });
    if (!user) {
        return res.status(401).json({ error: 'Invalid user ID or password.' });
    }

    const token = jwt.sign(
        { userId: user.UserName, roles: ["Trans App"] },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // res.cookie('token', token, {
    //     httpOnly: true,
    //     sameSite: 'None',
    //     maxAge: 7 * 24 * 60 * 60 * 1000,
    //     path: '/'
    // });

    res.cookie('user_roles', JSON.stringify(["Trans App"]), {
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
            userId: user.UserName,
            name: user.UserName,
            Photo: user.Photo,
            Division: division[user.Division],
            vehicles: user.myVehicles,
            roles: ["Trans App"],
            verified: true
        }
    });
});

module.exports = router;