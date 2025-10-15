import { Router } from 'express';
const router = Router();
import Role, { find as findRoles, findByIdAndUpdate as updateRole, findByIdAndDelete as deleteRole } from '../models/role.js';

// Get all roles
router.get('/', async (req, res) => {
    try {
        const roles = await findRoles();
        res.status(200).json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch roles', details: error });
    }
});

// Create a new role
router.post('/', async (req, res) => {
    const { name, permissions } = req.body;
    try {
        const newRole = new Role({ name, permissions });
        await newRole.save();
        res.status(201).json({ message: 'Role created', role: newRole });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create role', details: error });
    }
});

// Update a role
router.put('/:id', async (req, res) => {
    const { name, permissions } = req.body;
    try {
        const role = await updateRole(
            req.params.id,
            { name, permissions },
            { new: true }
        );
        if (!role) return res.status(404).json({ error: 'Role not found' });
        res.status(200).json({ message: 'Role updated', role });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update role', details: error });
    }
});

// Delete a role
router.delete('/:id', async (req, res) => {
    try {
        const role = await deleteRole(req.params.id);
        if (!role) return res.status(404).json({ error: 'Role not found' });
        res.status(200).json({ message: 'Role deleted', role });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete role', details: error });
    }
});

export default router;
