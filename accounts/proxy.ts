import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Define role-based dashboard routes
const ROLE_DASHBOARDS: Record<string, string> = {
    cashierAdmin: "/cashier",
    tempCashier: "/cashier",
    grManager: "/gr",
    accountant: "/accounts",
    admin: "/admin",
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

// Routes that should be accessible to all authenticated users
const COMMON_ROUTES = ["/profile", "/settings"];

export default auth((req: any) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const userRole = req.auth?.user?.role;
    const pathname = nextUrl.pathname;

    // Check if session has error (expired refresh token)
    if (req.auth?.error === "RefreshTokenError") {
        return NextResponse.redirect(new URL("/login?error=session-expired", nextUrl));
    }

    // Force password change check
    const isForced = req.auth?.user?.forcePasswordChange;
    if (isLoggedIn && isForced && pathname !== "/change-password" && !pathname.startsWith("/api")) {
        return NextResponse.redirect(new URL("/change-password?forced=true", nextUrl));
    }

    // Allow public routes
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        // Redirect to dashboard if already logged in
        if (isLoggedIn && userRole) {
            const dashboard = ROLE_DASHBOARDS[userRole] || "/";
            return NextResponse.redirect(new URL(dashboard, nextUrl));
        }
        return NextResponse.next();
    }

    // Allow public folder
    if (pathname.startsWith("/public")) {
        return NextResponse.next();
    }

    // Require authentication for all other routes
    if (!isLoggedIn) {
        // Save the original URL to redirect back after login
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Allow common routes for all authenticated users
    if (COMMON_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Role-based access control
    if (pathname.startsWith("/admin") && userRole !== "admin") {
        return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }

    if (pathname.startsWith("/cashier") && !["cashierAdmin", "tempCashier", "admin"].includes(userRole as string)) {
        return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }

    if (pathname.startsWith("/gr") && !["grManager", "admin"].includes(userRole as string)) {
        return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }

    if (pathname.startsWith("/accounts") && !["accountant", "admin"].includes(userRole as string)) {
        return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }

    // Redirect root to appropriate dashboard
    if (pathname === "/" && userRole) {
        const dashboard = ROLE_DASHBOARDS[userRole] || "/";
        return NextResponse.redirect(new URL(dashboard, nextUrl));
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};