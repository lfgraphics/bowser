import jwtPkg from 'jsonwebtoken';
const { verify } = jwtPkg;
import { findById as findCampUserById } from '../models/CampUsers.js';

// Middleware to verify admin token (generic admin verification)
export const verifyAdminToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Middleware to verify camp user token
export const verifyCampUserToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'camp') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        const user = await findCampUserById(decoded.userId);
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

// Check if user is admin or trans app admin
export const checkAdminAccess = async (req, res, next) => {
    try {
        const { user } = req;

        // Check if it's a camp admin
        if (user.type === 'camp') {
            const campUser = await findCampUserById(user.userId);
            if (campUser && campUser.role === 'admin') {
                req.isCampAdmin = true;
                return next();
            }
        }

        // Check if it's a trans app admin (would need to check trans app user model)
        // For now, we'll assume trans app users with admin role are allowed
        if (user.type === 'transapp' && user.role === 'admin') {
            req.isTransAppAdmin = true;
            return next();
        }

        // If neither, deny access
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });

    } catch (error) {
        console.error('Admin access check error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};