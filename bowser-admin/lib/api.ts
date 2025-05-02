import {
  Bowser,
  MainUser,
  Role,
  TripSheet,
  UnauthorizedLogin,
} from '@/types'
import axios from 'axios'

export const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL
export const gdApiKey = process.env.Google_Drive_Api_Key

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
  const response = await fetch(`${BASE_URL}/users`)
  if (!response.ok) throw new Error('Failed to fetch users')
  // console.log(response.json())
  return response.json()
}

export const getRoles = async (): Promise<Role[]> => {
  const response = await fetch(`${BASE_URL}/roles`)
  if (!response.ok) throw new Error('Failed to fetch roles')
  return response.json()
}

export const getUnAuthorizedLogins = async (): Promise<UnauthorizedLogin[]> => {
  const response = await fetch(`${BASE_URL}/users/un-authorized-logins`)
  if (!response.ok)
    throw new Error(
      'Failed to fetch Un Authorized logins or there are no un authorized logins'
    )
  return response.json()
}

export const updateUserVerification = async (
  phoneNo: string,
  verified: boolean
): Promise<MainUser> => {
  const response = await fetch(`${BASE_URL}/users/${phoneNo}/verify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verified })
  })
  if (!response.ok) throw new Error('Failed to update verification status')
  return response.json()
}

export const updateUserDevice = async (
  phoneNumber: string,
  newDeviceUUID: string
): Promise<{ message: string }> => {
  try {
    const response = await fetch(`${BASE_URL}/users/update-device`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, newDeviceUUID })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to update device UUID')
    }

    const data: { message: string } = await response.json()
    return data
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message)
    }
    throw new Error('An unknown error occurred')
  }
}

export const updateUserRoles = async (
  phoneNumber: string,
  roles: string[]
): Promise<MainUser> => {
  const response = await fetch(`${BASE_URL}/users/update/roles`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, roles })
  })
  if (!response.ok) throw new Error('Failed to update user roles')
  return response.json()
}
export const updateUserDepartment = async (
  phoneNumber: string,
  department: string
): Promise<MainUser> => {
  const response = await fetch(`${BASE_URL}/users/update/department`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, department })
  })
  if (!response.ok) throw new Error('Failed to update user department')
  return response.json()
}

export const deleteUnAuthorizedRequest = async (
  reqId: string
): Promise<{ message: string }> => {
  try {
    const response = await axios.delete<{ message: string }>(
      `${BASE_URL}/users/un-authorized-request/${reqId}`
    )

    if (response.status !== 200) {
      throw new Error('Failed to delete Unauthorized request')
    }

    return response.data
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Unknown error occurred'
    )
  }
}

export const deleteUser = async (userId: string): Promise<void> => {
  const response = await axios.delete(`${BASE_URL}/users/${userId}`)
  if (response.status !== 200) throw new Error('Failed to delete user')
}

export const createRole = async (role: Partial<Role>): Promise<Role> => {
  const response = await fetch(`${BASE_URL}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(role)
  })
  if (!response.ok) throw new Error('Failed to create role')
  return response.json()
}

export const updateRole = async (
  roleId: string,
  updatedRole: Partial<Role>
): Promise<Role> => {
  const response = await fetch(`${BASE_URL}/roles/${roleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedRole)
  })
  if (!response.ok) throw new Error('Failed to update role')
  return response.json()
}

export const deleteRole = async (roleId: string): Promise<void> => {
  const response = await fetch(`${BASE_URL}/roles/${roleId}`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Failed to delete role')
}

// Bowsers Management
export const getBowsers = async (): Promise<Bowser[]> => {
  const response = await fetch(`${BASE_URL}/bowsers`)
  if (!response.ok) throw new Error('Failed to fetch bowsers')
  return response.json()
}
export const getBowserById = async (id: string): Promise<Bowser> => {
  const response = await fetch(`${BASE_URL}/bowsers/${id}`)
  if (!response.ok) throw new Error('Failed to fetch bowsers')
  return response.json()
}

export const udpateBowser = async (
  id: string,
  data: Bowser
): Promise<Bowser> => {
  const response = await fetch(`${BASE_URL}/bowsers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  })
  if (!response.ok) throw new Error('Failed to update Bowser')
  return response.json()
}

export const deleteBowser = async (
  id: string
): Promise<{ message: string }> => {
  try {
    const response = await axios.delete<{ message: string }>(
      `${BASE_URL}/bowsers/${id}`
    )
    if (response.status !== 200) {
      throw new Error('Failed to delete Unauthorized request')
    }
    return response.data
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Unknown error occurred'
    )
  }
}

// TripSheets Management
export const getTripSheets = async (): Promise<TripSheet[]> => {
  const response = await fetch(`${BASE_URL}/tripSheet/all?unsettled=true`)
  if (!response.ok) throw new Error('Failed to fetch roles')
  return response.json()
}
