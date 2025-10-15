import { Router } from 'express';
const router = Router();
import jwtPkg from 'jsonwebtoken';
const { sign } = jwtPkg;
import { findOne as findOneTransUser } from '../../models/TransUser.js';
import { division } from './utils.js';
import argon2Pkg from 'argon2';
const { verify } = argon2Pkg;

router.post('/', async (req, res) => {
    const { userId, password } = req.body;
    console.log("Login attempt with userId:", userId);
    if (!userId || !password) {
        return res.status(400).json({ error: 'User ID and password are required.' });
    }
    // find by username first (case-insensitive)
    let user = await findOneTransUser({ UserName: { $regex: userId, $options: 'i' } });

    if (user) {
        if (user.hashed) {
            // stored password is hashed -> compare using argon2
            const hash = user.Password;
            let isPasswordValid = false;
            try {
                isPasswordValid = await verify(hash, password);
            } catch (err) {
                isPasswordValid = false;
            }
            if (!isPasswordValid) return res.status(401).json({ error: "Password didn't match" })
        } else {
            // stored password is plain (keep the previous regex-style matching)
            const passRegex = new RegExp(password, 'i');
            if (!passRegex.test(user.Password)) user = null;
        }
    } else {
        // fallback to original behavior if no user found by username alone
        user = await findOneTransUser({ UserName: { $regex: userId, $options: 'i' }, Password: { $regex: password, $options: 'i' } });
    }
    if (!user) {
        return res.status(401).json({ error: 'User Not found' });
    }

    const token = sign(
        { userId: user.UserName, roles: ["Trans App"] },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

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
            phoneNumber: user.phoneNumber,
            name: user.UserName,
            Photo: user.Photo,
            Division: division[user.Division],
            vehicles: user.myVehicles,
            roles: ["Trans App"],
            verified: true
        }
    });
});

export default router;