import axios from 'axios';
import { User, LoginResponse, SignupResponse } from '../types/auth';

const API_URL = 'https://bowser-backend-2cdr.onrender.com/auth';

export async function login(userId: string, password: string): Promise<LoginResponse> {
    try {
        const response = await axios.post<LoginResponse>(`${API_URL}/admin/login`, {
            userId,
            password,
            appName: 'Bowser Admin'
        });
        if (response.data.token) {
            localStorage.setItem('adminToken', response.data.token);
            localStorage.setItem('adminUser', JSON.stringify(response.data.user));
            localStorage.setItem('isLoggedIn', 'true');
            return response.data;
        }
        throw new Error('Login failed');
    } catch (error) {
        throw error;
    }
}

export function logout(): void {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.setItem('isLoggedIn', 'false');
    window.location.href = "/login"
}

export function isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('isLoggedIn') === 'true';
    }
    return false;
}

export function getCurrentUser(): User | null {
    if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('adminUser');
        return userData ? JSON.parse(userData) : null;
    }
    return null;
}

export async function signup(userData: { userId: string; password: string; name: string; phoneNumber: string }): Promise<SignupResponse> {
    try {
        const response = await axios.post<SignupResponse>(`${API_URL}/admin/signup`, userData);
        if (response.data.token) {
            localStorage.setItem('adminToken', response.data.token);
            localStorage.setItem('adminUser', JSON.stringify(response.data.user));
            return response.data;
        }
        throw new Error('Signup failed');
    } catch (error) {
        throw error;
    }
}
