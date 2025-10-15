import { Router } from 'express';
import { findOne as findOneDepartment } from '../models/Department.js';
const router = Router();
import { find as findUsers, findOneAndUpdate as updateUser, findOne as findOneUser, findByIdAndDelete as deleteUserById } from '../models/user.js';
import { find as findUnauthorizedLogins, findByIdAndDelete as deleteUnauthorizedLoginById } from '../models/unauthorizedLogin.js';
import { Types } from 'mongoose';
import { withTransaction } from '../utils/transactions.js';
import { handleTransactionError, createErrorResponse } from '../utils/errorHandler.js';

// Get all users with roles populated
router.get('/', async (req, res) => {
    const { searchParam } = req.query;
    try {
        if (searchParam) {
            const filter = {
                $and: [
                    {
                        $or: [
                            { phoneNumber: { $regex: searchParam, $options: "i" } },
                            { name: { $regex: searchParam, $options: "i" } },
                            { bowserId: { $regex: searchParam, $options: "i" } },
                        ],
                    },
                    { roles: '6710ddc21e5c7dc410e64e34' },
                    { verified: true },
                ]
            };
            const users = await findUsers(filter, { phoneNumber: 1, name: 1, bowserId: 1, _id: 0, roles: 1, department: 1 }).populate(['roles', 'department']).lean();
            if (users.length === 0) {
                return res.status(404).json({
                    title: "Error",
                    message: "No User found by the given parameter"
                });
            }

            return res.status(200).json(users);
        } else {
            const users = await findUsers().populate(['roles', 'department']).sort({ generationTime: -1 });
            return res.status(200).json(users);
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        const errorResponse = handleTransactionError(error, { route: '/', searchParam });
        return res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

// Update verification status
router.put('/:phoneNo/verify', async (req, res) => {
    try {
        const { verified } = req.body;
        const { phoneNo } = req.params;

        // Pre-transaction validation
        if (!phoneNo) {
            const errorResponse = createErrorResponse(400, 'Phone number is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        if (typeof verified !== 'boolean') {
            const errorResponse = createErrorResponse(400, 'Verified must be a boolean value');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        const user = await withTransaction(async (sessions) => {
            const updatedUser = await updateUser(
                { phoneNumber: phoneNo },
                { verified },
                { new: true, session: sessions.users }
            ).populate('roles');

            if (!updatedUser) {
                throw new Error('User not found');
            }

            return updatedUser;
        }, { connections: ['users'] });

        res.status(200).json(user);
    } catch (error) {
        console.error('Error updating verification status:', error);
        const errorResponse = handleTransactionError(error, { route: '/:phoneNo/verify', phoneNo: req.params.phoneNo });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

// Update or add roles
router.patch('/roles', async (req, res) => {
    try {
        const { roles, phoneNumber } = req.body;

        // Pre-transaction validation
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            const errorResponse = createErrorResponse(400, 'Roles array is required and cannot be empty');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        if (!phoneNumber) {
            const errorResponse = createErrorResponse(400, 'Phone number is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Find user before transaction to fail fast
        const user = await findOneUser({ phoneNumber });
        if (!user) {
            const errorResponse = createErrorResponse(404, 'User not found');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        const updatedUser = await withTransaction(async (sessions) => {
            // Convert roles to ObjectIds
            const roleObjectIds = roles.map((role) => new Types.ObjectId(role));
            
            user.roles = roleObjectIds;
            await user.save({ session: sessions.users });

            // Find updated user with populated fields
            const result = await findOneUser({ phoneNumber }).populate(["roles", "department"]).session(sessions.users);
            if (!result) {
                throw new Error("User not found after update");
            }

            return result;
        }, { connections: ['users'] });

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating roles:', error);
        const errorResponse = handleTransactionError(error, { route: '/roles', phoneNumber: req.body.phoneNumber });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

// update or add department
router.put('/update/department', async (req, res) => {
    try {
        const { department, phoneNumber } = req.body;

        // Pre-transaction validation
        if (!department || !phoneNumber) {
            const errorResponse = createErrorResponse(400, 'Department and phone number are required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Find user before transaction to fail fast
        const user = await findOneUser({ phoneNumber });
        if (!user) {
            const errorResponse = createErrorResponse(404, 'User not found');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        const updatedUser = await withTransaction(async (sessions) => {
            user.department = department;
            await user.save({ session: sessions.users });

            // Find updated user with populated fields
            const result = await findOneUser({ phoneNumber }).populate(["roles", "department"]).session(sessions.users);
            if (!result) {
                throw new Error("User not found after update");
            }

            return result;
        }, { connections: ['users'] });

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating department:', error);
        const errorResponse = handleTransactionError(error, { route: '/update/department', phoneNumber: req.body.phoneNumber });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

// Delete a user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Pre-transaction validation
        if (!id) {
            const errorResponse = createErrorResponse(400, 'User ID is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Validate ObjectId format
        if (!Types.ObjectId.isValid(id)) {
            const errorResponse = createErrorResponse(400, 'Invalid user ID format');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        const user = await withTransaction(async (sessions) => {
            const deletedUser = await deleteUserById(id, { session: sessions.users });
            if (!deletedUser) {
                throw new Error('User not found');
            }
            return deletedUser;
        }, { connections: ['users'] });

        res.status(200).json({ message: 'User deleted', user });
    } catch (error) {
        console.error('Error deleting user:', error);
        const errorResponse = handleTransactionError(error, { route: '/:id', userId: req.params.id });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

router.get('/un-authorized-logins', async (req, res) => {
    try {
        const unAuthorizedLogins = await findUnauthorizedLogins().sort({ timestamp: -1 }).exec();
        if (!unAuthorizedLogins || unAuthorizedLogins.length < 1) {
            return res.status(404).json({ message: 'No Un Authorized logins found' });
        } else {
            return res.status(200).json(unAuthorizedLogins);
        }
    } catch (error) {
        console.error('Error fetching unauthorized logins:', error);
        const errorResponse = handleTransactionError(error, { route: '/un-authorized-logins' });
        return res.status(errorResponse.statusCode).json(errorResponse.body);
    }
})

router.patch('/update-device', async (req, res) => {
    try {
        const { phoneNumber, newDeviceUUID } = req.body;

        // Pre-transaction validation
        if (!phoneNumber || !newDeviceUUID) {
            const errorResponse = createErrorResponse(400, 'Phone number and new device UUID are required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Find user before transaction to fail fast
        const user = await findOneUser({ phoneNumber });
        if (!user) {
            const errorResponse = createErrorResponse(404, 'User not found');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        await withTransaction(async (sessions) => {
            user.deviceUUID = newDeviceUUID;
            await user.save({ session: sessions.users });
        }, { connections: ['users'] });

        return res.status(200).json({ message: 'Device UUID updated successfully' });
    } catch (error) {
        console.error('Error updating device UUID:', error);
        const errorResponse = handleTransactionError(error, { route: '/update-device', phoneNumber: req.body.phoneNumber });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

router.delete('/un-authorized-request/:id', async (req, res) => {
    try {
        const requestId = req.params.id;

        // Pre-transaction validation
        if (!requestId) {
            const errorResponse = createErrorResponse(400, 'Request ID is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Validate ObjectId format
        if (!Types.ObjectId.isValid(requestId)) {
            const errorResponse = createErrorResponse(400, 'Invalid request ID format');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        const anAuthorizedDoc = await withTransaction(async (sessions) => {
            const deletedDoc = await deleteUnauthorizedLoginById(requestId, { session: sessions.users });
            if (!deletedDoc) {
                throw new Error('Document not found');
            }
            return deletedDoc;
        }, { connections: ['users'] });

        res.status(200).json({ message: "Requested un authorized data deleted successfully" });
    } catch (error) {
        console.error('Error deleting unauthorized request:', error);
        const errorResponse = handleTransactionError(error, { route: '/un-authorized-request/:id', requestId: req.params.id });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
})

router.put('/update', async (req, res) => {
    try {
        const { userId, name, phoneNumber } = req.body;

        // Pre-transaction validation
        if (!userId) {
            const errorResponse = createErrorResponse(400, 'User ID is required');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        if (!name && !phoneNumber) {
            const errorResponse = createErrorResponse(400, 'At least one field (name or phoneNumber) must be provided for update');
            return res.status(errorResponse.statusCode).json(errorResponse.body);
        }

        // Wrap database operations in transaction
        const updatedUser = await withTransaction(async (sessions) => {
            const result = await updateUser(
                { userId },
                { name, phoneNumber },
                { new: true, select: 'name phoneNumber', session: sessions.users }
            );

            if (!result) {
                throw new Error('User not found');
            }

            return result;
        }, { connections: ['users'] });

        res.status(200).json({ message: 'User updated successfully', user: { name: updatedUser.name, phoneNumber: updatedUser.phoneNumber } });
    } catch (error) {
        console.error('Error updating user:', error);
        const errorResponse = handleTransactionError(error, { route: '/update', userId: req.body.userId });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

router.get('/allocators', async (req, res) => {
    const { department} = req.query;
    let filter = { roles: '676ff015f63b19048c04649a' };
    try {
        if (department && typeof department !== 'undefined') {
            const deptDoc = await findOneDepartment({ name: department });
            if (!deptDoc) {
                return res.status(404).json({ message: 'Department not found' });
            }
            filter.department = deptDoc._id;
        }

        const allocators = await findUsers(
            filter,
            { name: 1, userId: 1, department: 1 }
        ).populate('department').lean();

        if (!allocators || allocators.length === 0) {
            return res.status(404).json({ message: 'No allocators found' });
        }

        res.status(200).json(allocators);
    } catch (error) {
        console.error('Error fetching allocators:', error);
        const errorResponse = handleTransactionError(error, { route: '/allocators', department: req.query.department });
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
});

export default router;
