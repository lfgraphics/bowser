import AccountUser from '../../models/AccountUser.js';
import jwtPkg from 'jsonwebtoken';
const { verify } = jwtPkg;

const verifyAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.substring(7);

        verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid token' });
            }

            if (decoded.role !== 'admin') {
                return res.status(403).json({ message: 'Admin access required' });
            }


            const user = await AccountUser.findById(decoded.id);
            if (!user || !user.isActive) {
                return res.status(401).json({ message: 'User not found or inactive' });
            }

            req.user = decoded;
            next();
        });
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const verifyUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.substring(7);

        verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid token' });
            }

            const user = await AccountUser.findById(decoded.id);
            if (!user || !user.isActive) {
                return res.status(401).json({ message: 'User not found or inactive' });
            }

            req.accountUser = user;
            next();
        });
    } catch (error) {
        console.error('Account auth middleware error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export {
    verifyAdmin,
    verifyUser
};