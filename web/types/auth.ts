import mongoose from 'mongoose'
import { TransAppUser } from '.'

export interface User {
  _id?: mongoose.Types.ObjectId
  id?: string
  userId: string
  name: string
  department?: string
  phoneNumber?: string
  phone?: string
  email?: string
  verified?: boolean
  roles: string[]
  Division?: string
  role?: string
  status?: string
  locations?: string[]
  type?: 'diesel' | 'camp'
}

export interface LoginResponse {
  error:string,
  token: string
  user: User
}

export interface SignupResponse {
  token: string
  user: User
}
