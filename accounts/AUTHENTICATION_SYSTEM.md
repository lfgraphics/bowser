# Authentication System Architecture

## Overview
This document describes the authentication system for the Accounts application, which uses a **client-server architecture** where:
- **Backend (Render)**: Handles all authentication logic, token generation, and database operations
- **Accounts App (Next.js)**: Frontend that communicates with the backend API

## Architecture Components

### 1. Backend (Deployed on Render)

#### Database Model: `AccountUser.js`
Location: `backend/src/models/AccountUser.js`

**Enhanced Fields:**
- **Basic Info**: `name`, `userId`, `email`
- **Authentication**: `password` (hashed with argon2, select: false)
- **RBAC**: `role` (cashierAdmin, tempCashier, grManager, accountant, admin), `permissions[]`
- **Account Status**: `isActive`, `validTill` (for temp cashiers)
- **Security**: `failedLoginAttempts`, `lockUntil`, `lastLogin`
- **Tokens**: `refreshToken`, `refreshTokenExpiry` (both select: false)
- **Audit**: `createdBy`, `createdAt`, `updatedAt` (auto-managed by timestamps)

**Instance Methods:**
- `isLocked()`: Checks if account is temporarily locked

#### API Routes: `accountAuth.js`
Location: `backend/src/routes/accountAuth.js`

**Endpoints:**

1. **POST `/api/account-auth/login`**
   - Validates credentials
   - Checks account status (active, locked, expired)
   - Implements account locking (5 failed attempts = 15 min lock)
   - Returns: `accessToken` (JWT, 1 hour), `refreshToken` (random, 30 days), user data

2. **POST `/api/account-auth/refresh`**
   - Validates refresh token
   - Issues new access token
   - Auto-rotates refresh token if expiring in < 7 days
   - Returns: new `accessToken`, potentially new `refreshToken`

3. **POST `/api/account-auth/logout`**
   - Invalidates refresh token in database
   - Clears user session

4. **POST `/api/account-auth/verify`**
   - Verifies access token validity
   - Returns user info if valid

5. **GET `/api/account-auth/dashboard-route/:role`**
   - Returns appropriate dashboard URL for user role

**Token Strategy:**
- **Access Token**: JWT, 1 hour expiry, contains userId, role, permissions
- **Refresh Token**: Random 64-byte hex, 30 days expiry, stored in DB
- **Rotation**: Refresh tokens auto-rotate when < 7 days remaining

### 2. Frontend (Next.js Accounts App)

#### NextAuth Configuration: `auth.ts`
Location: `accounts/auth.ts`

**Flow:**
1. User submits credentials
2. NextAuth calls backend `/api/account-auth/login`
3. Backend validates and returns tokens + user data
4. NextAuth stores tokens in encrypted JWT session cookie
5. On each request, NextAuth checks if access token needs refresh
6. If access token expires soon, calls `/api/account-auth/refresh`

**Key Features:**
- **No direct DB access** - all auth goes through backend API
- **Automatic token refresh** - proactive refresh 5 min before expiry
- **Error handling** - detects refresh token errors and redirects to login
- **Type safety** - Full TypeScript support with module augmentation

#### Proxy Middleware: `proxy.ts`
Location: `accounts/proxy.ts`

**Responsibilities:**
1. **Public Routes**: `/login`, `/signup`, `/forgot-password`, `/public/*`
2. **Authentication Check**: Redirects unauthenticated users to login with callback URL
3. **Role-Based Access Control (RBAC)**:
   - `/admin` → admin only
   - `/cashier` → cashierAdmin, tempCashier, admin
   - `/gr` → grManager, admin
   - `/accounts` → accountant, admin
4. **Auto-Redirect**: Root `/` redirects to role-specific dashboard
5. **Session Error Handling**: Detects expired refresh tokens

**Dashboard Routes by Role:**
```typescript
cashierAdmin → /cashier
tempCashier → /cashier
grManager → /gr
accountant → /accounts
admin → /admin
```

#### API Route Handler
Location: `accounts/app/api/auth/[...nextauth]/route.ts`

Exports NextAuth handlers for GET and POST requests.

## Authentication Flow

### Initial Login
```
1. User enters credentials on /login
2. NextAuth Credentials provider calls backend API
3. Backend validates credentials, checks account status
4. Backend generates access token (JWT) + refresh token (random)
5. Backend saves refresh token to database
6. Backend returns tokens + user data
7. NextAuth stores everything in encrypted session cookie
8. User redirected to role-specific dashboard (or callbackUrl)
```

### Subsequent Requests
```
1. Proxy middleware checks session from cookie
2. If session exists and valid → allow access
3. If session missing → redirect to /login with callbackUrl
4. If wrong role for route → redirect to /unauthorized
```

### Token Refresh (Automatic)
```
1. On each request, NextAuth JWT callback runs
2. Checks if access token expires in < 5 minutes
3. If yes, calls backend /api/account-auth/refresh
4. Backend validates refresh token from database
5. Backend issues new access token
6. If refresh token expires in < 7 days, backend rotates it
7. NextAuth updates session cookie with new tokens
```

### Logout
```
1. User clicks logout
2. Frontend calls signOut() from NextAuth
3. NextAuth clears session cookie
4. Optional: Call backend /api/account-auth/logout to invalidate refresh token
```

## Security Features

### 1. Account Locking
- 5 failed login attempts → 15-minute lock
- Prevents brute force attacks
- Resets on successful login

### 2. Token Security
- **Access tokens**: Short-lived (1 hour), JWT, stateless
- **Refresh tokens**: Long-lived (30 days), random, stored in DB
- **Rotation**: Refresh tokens auto-rotate before expiry
- **Invalidation**: Logout clears refresh token from DB

### 3. Password Security
- Hashed with argon2 (memory-hard, GPU-resistant)
- Never returned in API responses (select: false)

### 4. Session Security
- HttpOnly cookies (not accessible via JavaScript)
- Encrypted JWT session tokens
- SameSite: lax (CSRF protection)
- Secure flag in production

### 5. RBAC
- Role-based route protection in proxy middleware
- Permission arrays for granular access control
- Server-side validation in backend

## Environment Variables

### Backend (.env)
```env
JWT_SECRET=your-secret-key-here
# Database connection strings already configured
```

### Accounts App (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
AUTH_SECRET=generate-with-npx-auth-secret
NODE_ENV=development
```

## Setup Instructions

### 1. Backend Setup
```bash
# Already configured, just ensure JWT_SECRET is set
# The route is registered in backend/src/routes/index.js
```

### 2. Accounts App Setup
```bash
cd accounts

# Install dependencies (already done)
pnpm install

# Generate AUTH_SECRET
npx auth secret

# Create .env.local from example
cp .env.local.example .env.local
# Edit .env.local and add the generated AUTH_SECRET

# Run dev server
pnpm dev
```

### 3. CORS Configuration
Backend already allows `http://localhost:3001` for the accounts app.

## API Usage Examples

### Login
```typescript
const response = await fetch('http://localhost:5000/api/account-auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'admin', password: 'password123' })
});

const data = await response.json();
// { accessToken, refreshToken, refreshTokenExpiry, user: { id, userId, name, email, role, permissions } }
```

### Refresh Token
```typescript
const response = await fetch('http://localhost:5000/api/account-auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: 'stored-refresh-token' })
});

const data = await response.json();
// { accessToken, refreshToken, refreshTokenExpiry }
```

### Verify Token
```typescript
const response = await fetch('http://localhost:5000/api/account-auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accessToken: 'jwt-token' })
});

const data = await response.json();
// { valid: true, user: { ... } }
```

## Client-Side Usage (Next.js)

### Get Session
```typescript
import { auth } from "@/auth";

// Server Component
const session = await auth();
console.log(session.user.role); // 'admin'
console.log(session.user.permissions); // ['read:gr', 'create:trip']
```

### Sign In
```typescript
import { signIn } from "@/auth";

await signIn("credentials", {
  userId: "admin",
  password: "password123",
  redirectTo: "/admin" // or let it auto-redirect based on role
});
```

### Sign Out
```typescript
import { signOut } from "@/auth";

await signOut({ redirectTo: "/login" });
```

### Protected API Route
```typescript
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  if (session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }
  
  // Use session.accessToken to call backend APIs
  const response = await fetch('http://localhost:5000/api/some-endpoint', {
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    }
  });
  
  return Response.json(await response.json());
}
```

## Troubleshooting

### Issue: "Session expired" error
**Cause**: Refresh token expired or invalidated
**Solution**: User needs to log in again

### Issue: Redirected to /unauthorized
**Cause**: User role doesn't have access to the route
**Solution**: Check RBAC rules in proxy.ts

### Issue: CORS error
**Cause**: Frontend URL not in backend's allowedOrigins
**Solution**: Add URL to backend/index.js allowedOrigins array

### Issue: Token refresh fails
**Cause**: Refresh token not found in database or expired
**Solution**: User needs to log in again

## Future Enhancements

1. **Email Verification**: Add email verification flow
2. **Password Reset**: Implement forgot password functionality
3. **2FA**: Add two-factor authentication
4. **Session Management**: View and revoke active sessions
5. **Audit Logs**: Track all authentication events
6. **Rate Limiting**: Add rate limiting to prevent abuse
7. **Device Tracking**: Track and manage trusted devices

## Model Improvements Summary

The `AccountUser` model now includes:
- ✅ Security audit fields (lastLogin, failedLoginAttempts, lockUntil)
- ✅ Refresh token support for persistent sessions
- ✅ Granular permissions array for fine-grained access control
- ✅ Account lifecycle management (isActive, validTill)
- ✅ Proper indexing (unique userId, email)
- ✅ Data integrity (lowercase, trim, sparse unique)
- ✅ Automatic timestamps (createdAt, updatedAt)
- ✅ Instance methods (isLocked)

This creates a production-ready authentication system with modern security practices!
