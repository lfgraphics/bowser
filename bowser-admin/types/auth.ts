import mongoose from 'mongoose';

export interface User {
    _id: mongoose.Types.ObjectId;
    userId: string;
    name: string;
    phoneNumber: string;
    verified: boolean;
    roles: string[];
  }
  
  export interface LoginResponse {
    token: string;
    user: User;
  }
  
  export interface SignupResponse {
    token: string;
    user: User;
  }