import axios from 'axios'
import { BASE_URL } from './api'

// Types
export interface Account {
  _id?: string
  accountType: 'upi' | 'bankAccount'
  // UPI fields
  upiId?: string
  upiHolderName?: string
  // Bank Account fields
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  accountHolderName?: string
}

export interface CampUser {
  _id?: string
  id?: string
  name: string
  email?: string
  phone: string
  role: 'admin' | 'officer' | 'supervisor'
  status: 'active' | 'inactive' | 'suspended'
  locations?: string[]
  accounts?: Account[]
  configs?: Map<string, any>
  lastLogin?: Date
  loginAttempts?: number
  accountLocked?: boolean
  lockUntil?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface CampUsersPaginationResponse {
  users: CampUser[]
  pagination: {
    currentPage: number
    totalPages: number
    totalUsers: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface CampDashboardStats {
  stats: {
    total: number
    active: number
    inactive: number
    suspended: number
    byRole: Array<{ _id: string; count: number }>
  }
  recentUsers: CampUser[]
}

// Get authorization headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken')
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
}

// Admin Management APIs
export const campAdminAPI = {
  // Get all camp users with pagination and filters
  getUsers: async (params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    role?: string
  } = {}): Promise<CampUsersPaginationResponse> => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.status) queryParams.append('status', params.status)
    if (params.role) queryParams.append('role', params.role)

    const response = await axios.get(
      `${BASE_URL}/camp/admin/users?${queryParams.toString()}`,
      getAuthHeaders()
    )
    return response.data
  },

  // Get single camp user
  getUser: async (id: string): Promise<CampUser> => {
    const response = await axios.get(
      `${BASE_URL}/camp/admin/users/${id}`,
      getAuthHeaders()
    )
    return response.data
  },

  // Update camp user
  updateUser: async (id: string, userData: Partial<CampUser>): Promise<{ user: CampUser; message: string }> => {
    const response = await axios.put(
      `${BASE_URL}/camp/admin/users/${id}`,
      userData,
      getAuthHeaders()
    )
    return response.data
  },

  // Update user configs
  updateUserConfigs: async (id: string, configs: Record<string, any>): Promise<{ user: CampUser; message: string }> => {
    const response = await axios.put(
      `${BASE_URL}/camp/admin/users/${id}/configs`,
      { configs },
      getAuthHeaders()
    )
    return response.data
  },

  // Update user accounts
  updateUserAccounts: async (id: string, accounts: Account[]): Promise<{ user: CampUser; message: string }> => {
    const response = await axios.put(
      `${BASE_URL}/camp/admin/users/${id}/accounts`,
      { accounts },
      getAuthHeaders()
    )
    return response.data
  },

  // Delete camp user
  deleteUser: async (id: string): Promise<{ message: string }> => {
    const response = await axios.delete(
      `${BASE_URL}/camp/admin/users/${id}`,
      getAuthHeaders()
    )
    return response.data
  },

  // Reset user password
  resetPassword: async (id: string, newPassword: string): Promise<{ message: string }> => {
    const response = await axios.post(
      `${BASE_URL}/camp/admin/users/${id}/reset-password`,
      { newPassword },
      getAuthHeaders()
    )
    return response.data
  },

  // Verify/Approve user
  verifyUser: async (id: string): Promise<{ user: CampUser; message: string }> => {
    const response = await axios.post(
      `${BASE_URL}/camp/admin/users/${id}/verify`,
      {},
      getAuthHeaders()
    )
    return response.data
  },

  // Suspend user
  suspendUser: async (id: string): Promise<{ user: CampUser; message: string }> => {
    const response = await axios.post(
      `${BASE_URL}/camp/admin/users/${id}/suspend`,
      {},
      getAuthHeaders()
    )
    return response.data
  },

  // Get dashboard stats
  getDashboardStats: async (): Promise<CampDashboardStats> => {
    const response = await axios.get(
      `${BASE_URL}/camp/admin/dashboard/stats`,
      getAuthHeaders()
    )
    return response.data
  }
}

// User Profile APIs
export const campProfileAPI = {
  // Get current user profile
  getProfile: async (): Promise<CampUser> => {
    const response = await axios.get(
      `${BASE_URL}/camp/profile`,
      getAuthHeaders()
    )
    return response.data
  },

  // Update profile
  updateProfile: async (profileData: { name?: string; email?: string; locations?: string[] }): Promise<{ user: CampUser; message: string }> => {
    const response = await axios.put(
      `${BASE_URL}/camp/profile`,
      profileData,
      getAuthHeaders()
    )
    return response.data
  },

  // Update profile configs (non-readonly only)
  updateConfigs: async (configs: Record<string, any>): Promise<{ user: CampUser; message: string }> => {
    const response = await axios.put(
      `${BASE_URL}/camp/profile/configs`,
      { configs },
      getAuthHeaders()
    )
    return response.data
  },

  // Update profile accounts
  updateAccounts: async (accounts: Account[]): Promise<{ user: CampUser; message: string }> => {
    const response = await axios.put(
      `${BASE_URL}/camp/profile/accounts`,
      { accounts },
      getAuthHeaders()
    )
    return response.data
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await axios.put(
      `${BASE_URL}/camp/profile/change-password`,
      { currentPassword, newPassword },
      getAuthHeaders()
    )
    return response.data
  },

  // Get user locations
  getLocations: async (): Promise<{ locations: string[] }> => {
    const response = await axios.get(
      `${BASE_URL}/camp/profile/locations`,
      getAuthHeaders()
    )
    return response.data
  },

  // Get user activity
  getActivity: async (): Promise<{
    lastLogin?: Date
    accountCreated?: Date
    accountStatus: string
    role: string
    loginAttempts: number
    isLocked: boolean
  }> => {
    const response = await axios.get(
      `${BASE_URL}/camp/profile/activity`,
      getAuthHeaders()
    )
    return response.data
  }
}