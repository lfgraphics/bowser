import mongoose from 'mongoose'
import { TransAppUser } from '.'

export interface User {
  _id: mongoose.Types.ObjectId
  userId: string
  name: string
  department: string
  phoneNumber: string
  verified: boolean
  roles: string[]
  Division: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface SignupResponse {
  token: string
  user: User
}
