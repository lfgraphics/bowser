import {
  Bowser,
  MainUser,
  Role,
  TripSheet,
  UnauthorizedLogin,
} from '@/types'
import axios from 'axios'
import { createApiClient } from './apiClient'
import {
  ApiError,
  ApiResponse,
  LoadingState,
  RequestConfig,
  DEFAULT_RETRY_CONFIG
} from '@/types/api'

export const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL
export const gdApiKey = process.env.Google_Drive_Api_Key

// Safe baseURL configuration with environment-specific fallbacks
const getBaseURL = (): string => {
  if (BASE_URL) {
    return BASE_URL;
  }
  
  // Only allow localhost fallback in development
  if (process.env.NODE_ENV === 'development') {
    return 'http://192.168.88.165:5000';
  }
  
  // Throw error in production if env var is missing
  throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is required in production');
};

// Initialize API client with configuration
export const apiClient = createApiClient({
  baseURL: getBaseURL(),
  timeout: 30000,
  retry: {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryableErrorCodes: ['TIMEOUT', 'INTERNAL']
  },
  getAuthToken: () => {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem('adminToken') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('adminToken') ||
      sessionStorage.getItem('authToken') ||
      sessionStorage.getItem('token')
    );
  }
})

// Error handling utilities
export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError
}

export const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}

export const isRetryableError = (error: unknown): boolean => {
  if (isApiError(error)) {
    return error.isRetryable
  }
  return false
}

// Loading state helpers
export const getLoadingState = (key: string): LoadingState | null => {
  return apiClient.getLoadingState(key)
}

export const isRequestLoading = (key: string): boolean => {
  return apiClient.isLoading(key)
}

export const getDriveFileSize = async (fileUrl: string) => {
  const fileIdMatch = fileUrl.match(/\/d\/([^/]+)\//);
  if (!fileIdMatch) return null;

  const fileId = fileIdMatch[1];
  const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=size&key=${gdApiKey}`;

  try {
    const res = await axios.get(apiUrl);
    const sizeInMB = (Number(res.data.size) / (1024 * 1024)).toFixed(2);
    return sizeInMB;
  } catch (err) {
    console.error("Drive API error:", err instanceof Error ? err.message : "Unknown error");
    return null;
  }
}
// Users and Roles Management
export const getUsers = async (): Promise<MainUser[]> => {
  const response = await apiClient.get<MainUser[]>('/users')
  return response.data
}

export const getRoles = async (): Promise<Role[]> => {
  const response = await apiClient.get<Role[]>('/roles')
  return response.data
}

export const getUnAuthorizedLogins = async (): Promise<UnauthorizedLogin[]> => {
  const response = await apiClient.get<UnauthorizedLogin[]>('/users/un-authorized-logins')
  return response.data
}

export const updateUserVerification = async (
  phoneNo: string,
  verified: boolean
): Promise<MainUser> => {
  const response = await apiClient.put<MainUser>(`/users/${phoneNo}/verify`, { verified }, withConcurrentPrevention())
  return response.data
}

export const updateUserDevice = async (
  phoneNumber: string,
  newDeviceUUID: string
): Promise<{ message: string }> => {
  const response = await apiClient.patch<{ message: string }>('/users/update-device', {
    phoneNumber,
    newDeviceUUID
  }, withConcurrentPrevention())
  return response.data
}

export const updateUserRoles = async (
  phoneNumber: string,
  roles: string[]
): Promise<MainUser> => {
  const response = await apiClient.put<MainUser>('/users/update/roles', {
    phoneNumber,
    roles
  }, withConcurrentPrevention())
  return response.data
}

export const updateUserDepartment = async (
  phoneNumber: string,
  department: string
): Promise<MainUser> => {
  const response = await apiClient.put<MainUser>('/users/update/department', {
    phoneNumber,
    department
  }, withConcurrentPrevention())
  return response.data
}

export const deleteUnAuthorizedRequest = async (
  reqId: string
): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(
    `/users/un-authorized-request/${reqId}`,
    withConcurrentPrevention()
  )
  return response.data
}

export const deleteUser = async (userId: string): Promise<void> => {
  await apiClient.delete<void>(`/users/${userId}`, withConcurrentPrevention())
}

export const createRole = async (role: Partial<Role>): Promise<Role> => {
  const response = await apiClient.post<Role>('/roles', role, withConcurrentPrevention())
  return response.data
}

export const updateRole = async (
  roleId: string,
  updatedRole: Partial<Role>
): Promise<Role> => {
  const response = await apiClient.put<Role>(`/roles/${roleId}`, updatedRole, withConcurrentPrevention())
  return response.data
}

export const deleteRole = async (roleId: string): Promise<void> => {
  await apiClient.delete<void>(`/roles/${roleId}`, withConcurrentPrevention())
}

// Bowsers Management
export const getBowsers = async (): Promise<Bowser[]> => {
  const response = await apiClient.get<Bowser[]>('/bowsers')
  return response.data
}

export const getBowserById = async (id: string): Promise<Bowser> => {
  const response = await apiClient.get<Bowser>(`/bowsers/${id}`)
  return response.data
}

export const udpateBowser = async (
  id: string,
  data: Bowser
): Promise<Bowser> => {
  // Send bowser data directly, not wrapped in { data }
  const response = await apiClient.put<Bowser>(`/bowsers/${id}`, data, withConcurrentPrevention())
  return response.data
}

export const deleteBowser = async (
  id: string
): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/bowsers/${id}`, withConcurrentPrevention())
  return response.data
}

// TripSheets Management
export const getTripSheets = async (): Promise<TripSheet[]> => {
  const response = await apiClient.get<TripSheet[]>('/tripSheet/all?unsettled=true')
  return response.data
}

// StackHolders Management
export interface StackHolder {
  _id: string
  InstitutionName: string
  IsBillingParty?: boolean
  IsConsignee?: boolean
  IsConsigner?: boolean
  Location: string
  shortName?: string
  loadingSupervisor?: string
}

export const getStackHolders = async (searchTerm: string = ''): Promise<StackHolder[]> => {
  const response = await apiClient.get<StackHolder[]>(`/trans-app/stack-holders?params=${encodeURIComponent(searchTerm)}`)
  return response.data
}

export const getAllStackHolders = async (): Promise<StackHolder[]> => {
  const response = await apiClient.get<StackHolder[]>('/trans-app/stack-holders?params=')
  return response.data
}

// Transaction-aware parallel functions that expose requestId metadata
// These functions return the full ApiResponse<T> including requestId for transaction correlation

export const getUsersWithMeta = async (): Promise<ApiResponse<MainUser[]>> => {
  return await apiClient.get<MainUser[]>('/users')
}

export const getRolesWithMeta = async (): Promise<ApiResponse<Role[]>> => {
  return await apiClient.get<Role[]>('/roles')
}

export const getBowsersWithMeta = async (): Promise<ApiResponse<Bowser[]>> => {
  return await apiClient.get<Bowser[]>('/bowsers')
}

export const getTripSheetsWithMeta = async (): Promise<ApiResponse<TripSheet[]>> => {
  return await apiClient.get<TripSheet[]>('/tripSheet/all?unsettled=true')
}

export const createUserWithMeta = async (userData: Partial<MainUser>): Promise<ApiResponse<MainUser>> => {
  return await apiClient.post<MainUser>('/users', userData, withConcurrentPrevention())
}

export const updateUserVerificationWithMeta = async (
  phoneNo: string,
  verified: boolean
): Promise<ApiResponse<MainUser>> => {
  return await apiClient.put<MainUser>(`/users/${phoneNo}/verify`, { verified }, withConcurrentPrevention())
}

export const createRoleWithMeta = async (role: Partial<Role>): Promise<ApiResponse<Role>> => {
  return await apiClient.post<Role>('/roles', role, withConcurrentPrevention())
}

// Basic user creation function
export const createUser = async (userData: Partial<MainUser>): Promise<MainUser> => {
  const response = await apiClient.post<MainUser>('/users', userData, withConcurrentPrevention())
  return response.data
}

// Concurrent prevention helpers
export const withConcurrentPrevention = (concurrencyKey?: string, config?: RequestConfig): RequestConfig => ({
  ...config,
  preventConcurrent: true,
  ...(concurrencyKey && { concurrencyKey })
})

export const createUserSafe = async (userData: Partial<MainUser>): Promise<MainUser> => {
  const response = await apiClient.post<MainUser>('/users', userData, withConcurrentPrevention())
  return response.data
}

export const updateUserVerificationSafe = async (
  phoneNo: string,
  verified: boolean
): Promise<MainUser> => {
  const response = await apiClient.put<MainUser>(
    `/users/${phoneNo}/verify`, 
    { verified }, 
    withConcurrentPrevention()
  )
  return response.data
}

export const createRoleSafe = async (role: Partial<Role>): Promise<Role> => {
  const response = await apiClient.post<Role>('/roles', role, withConcurrentPrevention())
  return response.data
}
