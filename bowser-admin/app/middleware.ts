// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt, { JwtPayload } from 'jsonwebtoken'

export async function middleware(req: NextRequest) {
  // Typically you'd store the token in cookies, e.g. "Authorization" cookie
  const token = req.cookies.get('adminToken')?.value 
  if (!token) {
    // No token? Possibly redirect to login or error
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  try {
    // 2. Verify & decode
    const secret = process.env.JWT_SECRET as string
    const decoded = jwt.verify(token, secret) as JwtPayload & { roles: string[] }

    // 3. Check user roles
    const userRoles = decoded.roles || []
    // Example: if you're restricting access to /admin path only to 'Admin' role
    if (req.nextUrl.pathname.startsWith('/admin')) {
      if (!userRoles.includes('Admin')) {
        return NextResponse.redirect(new URL('/403', req.url))
      }
    }
    
    // If you're restricting /browsers path only to roles: 'BowserAdmin', 'DieselControlCenterStaff', etc
    if (req.nextUrl.pathname.startsWith('/browsers')) {
      const allowedRoles = ['BowserAdmin', 'DieselControlCenterStaff', /* etc. */ ]
      const hasAccess = userRoles.some((role) => allowedRoles.includes(role))
      if (!hasAccess) {
        return NextResponse.redirect(new URL('/403', req.url))
      }
    }

    // If everything is good, let them through
    return NextResponse.next()

  } catch (err) {
    // Token invalid or expired
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

// For which routes does this middleware run?
export const config = {
  matcher: [
    '/admin/:path*',       // run for /admin/*
    '/browsers/:path*',    // run for /browsers/*
    // etc...
  ],
}
