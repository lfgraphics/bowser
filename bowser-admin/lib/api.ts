import { Role, User } from "@/types";
import axios from "axios";

const BASE_URL = 'https://bowser-backend-2cdr.onrender.com';  //https://bowser-backend-2cdr.onrender.com  http://localhost:5000

export const getUsers = async (): Promise<User[]> => {
    const response = await fetch(`${BASE_URL}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
};

export const getRoles = async (): Promise<Role[]> => {
    const response = await fetch(`${BASE_URL}/roles`);
    if (!response.ok) throw new Error('Failed to fetch roles');
    return response.json();
};

export const updateUserVerification = async (userId: string, verified: boolean): Promise<User> => {
    const response = await fetch(`${BASE_URL}/users/${userId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
    });
    if (!response.ok) throw new Error('Failed to update verification status');
    return response.json();
};

export const updateUserRoles = async (userId: string, roles: string[]): Promise<User> => {
    const response = await fetch(`${BASE_URL}/users/${userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles }),
    });
    if (!response.ok) throw new Error('Failed to update user roles');
    return response.json();
};

export const deleteUser = async (userId: string): Promise<void> => {
    const response = await axios.delete(`${BASE_URL}/users/${userId}`)
    if (response.status !== 200) throw new Error('Failed to delete user');
};

export const createRole = async (role: Partial<Role>): Promise<Role> => {
    const response = await fetch(`${BASE_URL}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(role),
    });
    if (!response.ok) throw new Error('Failed to create role');
    return response.json();
};

export const updateRole = async (roleId: string, updatedRole: Partial<Role>): Promise<Role> => {
    const response = await fetch(`${BASE_URL}/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRole),
    });
    if (!response.ok) throw new Error('Failed to update role');
    return response.json();
};

export const deleteRole = async (roleId: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/roles/${roleId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete role');
};
