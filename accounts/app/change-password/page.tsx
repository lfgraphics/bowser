"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Lock } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function ChangePasswordPage() {
    const router = useRouter();
    const { data: session, status, update } = useSession();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [isForced, setIsForced] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (session?.user?.forcePasswordChange) {
            setIsForced(true);
        } else {
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get("forced") === "true") {
                setIsForced(true);
            }
        }
    }, [status, session, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/account-auth/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: session?.user?.userId,
                    currentPassword: isForced ? undefined : currentPassword,
                    newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Failed to change password");
                return;
            }

            setSuccess(data.message);
            
            // Update session to clear forced flag
            await update({
                ...session,
                user: {
                    ...session?.user,
                    forcePasswordChange: false
                }
            });

            // Role-based dashboard mapping
            const dashboardRoutes: Record<string, string> = {
                admin: "/admin",
                cashierAdmin: "/cashier",
                tempCashier: "/cashier",
                grManager: "/gr",
                accountant: "/accounts",
            };
            const dashboard = dashboardRoutes[session?.user?.role || ""] || "/";

            setTimeout(() => {
                router.push(dashboard);
            }, 1500);
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950 p-4">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
            
            <Card className="w-full max-w-md relative z-10 shadow-2xl glass-card overflow-hidden">
                <CardHeader className="space-y-1">
                    <div className="mx-auto w-16 h-16 bg-linear-to-br from-brand-warning to-brand-danger rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-warning/50">
                        <Lock className="w-10 h-10 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center text-white">
                        {isForced ? "Change Your Password" : "Update Password"}
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-center">
                        {isForced
                            ? "For security reasons, you must change your password before continuing"
                            : "Update your password to keep your account secure"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-400">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert className="bg-brand-success/10 border-brand-success/50 text-brand-success">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>{success}</AlertDescription>
                            </Alert>
                        )}

                        {!isForced && (
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword" className="text-slate-300">
                                    Current Password
                                </Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    placeholder="Enter current password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="bg-brand-bg-800/50 border-brand-border text-white placeholder:text-slate-500"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-slate-300">
                                New Password
                            </Label>
                            <Input
                                id="newPassword"
                                type="password"
                                placeholder="Enter new password (min 6 characters)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-brand-bg-800/50 border-brand-border text-white placeholder:text-slate-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-slate-300">
                                Confirm New Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-brand-bg-800/50 border-brand-border text-white placeholder:text-slate-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-linear-to-r from-brand-warning to-brand-danger hover:from-brand-warning/90 hover:to-brand-danger/90 text-white font-semibold py-6 shadow-lg shadow-brand-danger/20 transition-all duration-300 hover:scale-[1.01]"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Changing Password...
                                </>
                            ) : (
                                "Change Password"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
