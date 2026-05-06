import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                userId: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.userId || !credentials?.password) return null;

                try {
                    // Call backend API for authentication
                    const response = await fetch(`${BACKEND_URL}/account-auth/login`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            userId: credentials.userId,
                            password: credentials.password,
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.warn(`[Auth] Backend rejected login for ${credentials.userId}: ${errorData.message}`);
                        // In Auth.js v5, throwing CredentialsSignin is standard for auth failures
                        throw new CredentialsSignin(errorData.message || "Invalid credentials");
                    }

                    const data = await response.json();

                    return {
                        id: data.user.id,
                        userId: data.user.userId,
                        name: data.user.name,
                        email: data.user.email,
                        role: data.user.role,
                        permissions: data.user.permissions,
                        forcePasswordChange: data.forcePasswordChange,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        refreshTokenExpiry: data.refreshTokenExpiry,
                    };
                } catch (error) {
                    if (error instanceof CredentialsSignin) throw error;
                    
                    console.error("[Auth] Unexpected authorization error:", error);
                    throw error;
                }
            },
        }) as any, // Cast to any to bypass type mismatch in beta version
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (trigger === "update" && session?.user) {
                // Update specific fields from session update
                if (session.user.name) token.name = session.user.name;
                if (session.user.email) token.email = session.user.email;
                if (session.user.forcePasswordChange !== undefined) {
                    token.forcePasswordChange = session.user.forcePasswordChange;
                }
                return token;
            }

            if (user) {
                const now = Date.now();
                token.userId = user.userId;
                token.role = user.role;
                token.permissions = user.permissions;
                token.forcePasswordChange = user.forcePasswordChange;
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.refreshTokenExpiry = user.refreshTokenExpiry;
                token.accessTokenExpiry = now + 60 * 60 * 1000;
                return token;
            }

            const now = Date.now();
            const accessTokenExpiry = (token.accessTokenExpiry as number) || 0;

            if (!accessTokenExpiry || now < accessTokenExpiry - 5 * 60 * 1000) {
                return token;
            }

            if (!token.refreshToken) {
                token.error = "RefreshTokenError";
                return token;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/account-auth/refresh`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        refreshToken: token.refreshToken,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to refresh token");
                }

                token.accessToken = data.accessToken;
                token.refreshToken = data.refreshToken;
                token.refreshTokenExpiry = data.refreshTokenExpiry;
                token.forcePasswordChange = data.forcePasswordChange;
                token.accessTokenExpiry = now + 60 * 60 * 1000;
                token.error = undefined;
            } catch (error) {
                console.error("Error refreshing token:", error);
                token.error = "RefreshTokenError";
            }

            return token;
        },
        
        // RBAC: Expose roles and permissions to the session (client-side)
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub as string;
                session.user.userId = token.userId as string;
                session.user.role = token.role as string;
                session.user.permissions = token.permissions as string[];
                session.user.forcePasswordChange = token.forcePasswordChange as boolean;
                session.accessToken = token.accessToken as string;
                session.error = token.error as string | undefined;
            }
            return session;
        },
        
        // Redirect after sign in based on role
        async redirect({ url, baseUrl }) {
            // If url is a relative path, it's a callback URL
            if (url.startsWith("/")) {
                return `${baseUrl}${url}`;
            }
            // If url is on the same origin, allow it
            if (new URL(url).origin === baseUrl) {
                return url;
            }
            return baseUrl;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 5 * 60,
    },
    cookies: {
        sessionToken: {
            name: `bowser.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    secret: process.env.AUTH_SECRET, // Explicitly add secret
});

// Type augmentation for TypeScript
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            userId: string;
            name?: string | null;
            email?: string | null;
            role: string;
            permissions: string[];
            forcePasswordChange: boolean;
        };
        accessToken: string;
        error?: string;
    }

    interface User {
        userId: string;
        role: string;
        permissions: string[];
        forcePasswordChange: boolean;
        accessToken: string;
        refreshToken: string;
        refreshTokenExpiry: number;
    }
}

// Augment JWT type directly within next-auth module or rely on token being any/Record
// next-auth v5 beta types can be tricky with augmentations. 
// We will augment the JWT interface if possible, or just use the generic Record type in callbacks.
