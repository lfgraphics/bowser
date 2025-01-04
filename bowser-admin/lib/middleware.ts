// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware (req: NextRequest) {
  const cookies = req.cookies; // Get all cookies
  console.log('All cookies:', cookies); // Log all cookies

  const token = cookies.get('token')?.value; // Get the token
  console.log('Token from cookies:', token); // Log the token

  if (!token) {
    console.log('No token found, redirecting to login');
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    // Use the verifyToken function to get roles
    const roles = await verifyToken(); // Call the verifyToken function
    console.log('Roles retrieved from verifyToken:', roles); // Log roles

    if (!roles || roles.length === 0) {
      console.log('No roles found, redirecting to unauthorized');
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    console.log('User roles:', roles); // Log user roles

    const requestedPath = req.nextUrl.pathname
    console.log('Requested path:', requestedPath); // Log the requested path

    // Define allowed routes for roles
    const allowedRoutes: { [key: string]: string[] } = {
      Admin: ['/manage-users', '/dashboard'],
      'Diesel Control Center Staff': ['/dashboard'],
      'Data Entry': ['/dispense-records'],
      'Loading Incharge': ['/loading/orders'],
      'BCC Authorized Officer': ['/loading/sheet'],
      'Petrol Pump Personnel': ['/loading/petrol-pump'],
      // Add more roles as needed
    }

    // Check if the requested path is allowed for the user's roles
    const isAllowed = roles.some((role: string | number) => {
      const routes = allowedRoutes[role] || []
      const isRouteAllowed = routes.includes(requestedPath)
      console.log(`Checking role: ${role}, Allowed routes: ${routes}, Is route allowed: ${isRouteAllowed}`);
      return isRouteAllowed
    })

    if (!isAllowed) {
      console.log(`Access denied for user roles: ${roles.join(', ')} on path: ${requestedPath}`)
      return NextResponse.redirect(new URL('/unauthorized', req.url)) // Redirect if not allowed
    }

    // If you're restricting /browsers path only to roles: 'BowserAdmin', 'DieselControlCenterStaff', etc

    // If everything is good, let them through
    return NextResponse.next()
  } catch (err) {
    console.error('Token verification failed:', err); // Log error details
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
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|signup|profile|unauthorized).*)'
  ]
}
