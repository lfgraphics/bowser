import axios from 'axios'
import { User, LoginResponse, SignupResponse } from '../types/auth'
import {
  registerPushSubscription,
  unregisterPushSubscription
} from '@/utils/pushNotifications'
import { BASE_URL } from './api'
import { toast } from 'sonner'

export async function signup(userData: {
  userId: string
  password: string
  name: string
  phoneNumber: string
}): Promise<SignupResponse> {
  try {
    const response = await axios.post<SignupResponse>(
      `${BASE_URL}/auth/admin/signup`,
      userData
    )
    if (response.data.token) {
      localStorage.setItem('adminToken', response.data.token)
      localStorage.setItem('adminUser', JSON.stringify(response.data.user))
      return response.data
    }
    throw new Error('Signup failed')
  } catch (error) {
    throw error
  }
}

export async function login(
  userId: string,
  password: string
): Promise<LoginResponse> {
  try {
    const response = await axios.post<LoginResponse>(
      `${BASE_URL}/auth/admin/login`,
      {
        userId,
        password,
        appName: 'Bowser Admin'
      },
      { withCredentials: true } // Include cookies in requests
    )
    if (response.data.token) {
      localStorage.setItem('adminToken', response.data.token)
      localStorage.setItem('adminUser', JSON.stringify(response.data.user))
      localStorage.setItem('isLoggedIn', 'true')

      if (response.data.user.phoneNumber) {
        let groups = response.data.user.roles
        if (response.data.user.department) groups.push(response.data.user.department)
        if (response.data.user.Division) groups.push(response.data.user.Division)
        await registerPushSubscription(
          response.data.user.phoneNumber,
          response.data.user.userId,
          groups
        )
      }
      return response.data
    }
    throw new Error('Login failed')
  } catch (error) {
    throw error
  }
}
export async function TransAppLogin(
  userId: string,
  password: string
): Promise<LoginResponse> {
  try {
    const res = await fetch(`${BASE_URL}/trans-app/login`, {
      method: 'POST',
      credentials: 'include', // include cookies
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        password,
        appName: 'Bowser Admin'
      })
    })

    const data = await res.json().catch(() => ({}))

    if (res.ok && data.token) {
      localStorage.setItem('adminToken', data.token)
      localStorage.setItem('adminUser', JSON.stringify(data.user))
      localStorage.setItem('isLoggedIn', 'true')

      if (data.user && data.user.phoneNumber) {
        const groups: string[] = Array.isArray(data.user.roles) ? [...data.user.roles] : []
        if (data.user.department) groups.push(data.user.department)
        if (data.user.Division) groups.push(data.user.Division)

        await registerPushSubscription(
          data.user.phoneNumber,
          data.user.userId,
          groups
        )
      }
      return data as LoginResponse
    }

    const errMsg = (data && (data.error || data.message)) || res.statusText || 'Login failed'
    throw new Error(errMsg)
  } catch (error: any) {
    const message = error?.message || 'Login failed'
    toast.error(message, { richColors: true })
    throw error
  }
}

export async function logout(): Promise<void> {
  try {
    const userData = localStorage.getItem('adminUser')
    if (!userData) {
      return
    }

    const jsonData = JSON.parse(userData)
    const mobileNo = jsonData.phoneNumber

    let unregisterResponse = { success: true }
    if (mobileNo) {
      unregisterResponse = await unregisterPushSubscription(mobileNo)
    }

    if (unregisterResponse.success) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      localStorage.setItem('isLoggedIn', 'false')

      window.location.href = '/login'
    } else {
      alert('Failed to unregister push notifications. Logout aborted.')
    }
  } catch (error) {
    alert('An unexpected error occurred. Please try again.')
  }
}

export function isAuthenticated(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('isLoggedIn') === 'true'
  }
  return false
}

export function getCurrentUser(): User | null {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('adminUser')
    return userData ? JSON.parse(userData) : null
  }
  return null
}

export async function verifyToken() {
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/admin/verify-token`,
      {}, // Empty body since it's a verification request
      { withCredentials: true } // Include cookies in requests
    )

    if (response.status !== 200) {
      throw new Error('Failed to verify token')
    }

    const data = response.data
    return data.roles // Return the roles
  } catch (error) {
    return []
  }
}
