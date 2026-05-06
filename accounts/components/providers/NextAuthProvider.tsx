"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

/**
 * Component to handle global session errors like token refresh failures.
 * When a RefreshTokenError is detected, it automatically signs the user out.
 */
function SessionErrorHandler({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.error === "RefreshTokenError") {
            // Force sign out and redirect to login with a message
            signOut({ 
                callbackUrl: "/login?error=session-expired",
                redirect: true 
            });
        }
    }, [session]);

    return <>{children}</>;
}

export const NextAuthProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <SessionProvider>
            <SessionErrorHandler>
                {children}
            </SessionErrorHandler>
        </SessionProvider>
    );
};
