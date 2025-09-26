// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { allowedRoutes } from '@/app/(auth)/login/page';

export async function middleware (req: NextRequest) {
  const cookies = req.cookies; // Get all cookies
  // Avoid logging cookies in production

  const token = cookies.get('token')?.value; // Get the token
  // Do not log tokens

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    // Use the verifyToken function to get roles
    const roles = await verifyToken(); // Call the verifyToken function

    if (!roles || roles.length === 0) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    const requestedPath = req.nextUrl.pathname
    // Requested path: requestedPath

    // Check if the requested path is allowed for the user's roles
    const isAllowed = roles.some((role: string | number) => {
      const routes = allowedRoutes[role] || []
      const isRouteAllowed = routes.includes(requestedPath)
      return isRouteAllowed
    })

    if (!isAllowed) {
      return NextResponse.redirect(new URL('/unauthorized', req.url)) // Redirect if not allowed
    }

    // If you're restricting /browsers path only to roles: 'BowserAdmin', 'DieselControlCenterStaff', etc

    // If everything is good, let them through
    return NextResponse.next()
  } catch (err) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

// For which routes does this middleware run?

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - login, signup (login and signup pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|signup|profile|unauthorized|download).*)'
  ]
}
