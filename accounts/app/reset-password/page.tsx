"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!token || !userId) {
            setError("Invalid reset link. Please request a new one.");
            return;
        }

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
            const response = await fetch(`${BACKEND_URL}/account-auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, resetToken: token, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Failed to reset password");
                return;
            }

            setSuccess("Password reset successful! Redirecting to login...");
            setTimeout(() => router.push("/login"), 3000);
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!token || !userId) {
        return (
            <Card className="w-full max-w-md relative z-10 shadow-2xl border-brand-border bg-brand-bg-900/50 backdrop-blur-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-red-400">Invalid Link</CardTitle>
                    <CardDescription className="text-slate-400">
                        This password reset link is invalid or incomplete.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Link href="/forgot-password">
                        <Button variant="outline" className="border-brand-border text-slate-300 hover:bg-brand-bg-800">
                            Request New Link
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md relative z-10 shadow-2xl border-brand-border bg-brand-bg-900/50 backdrop-blur-xl">
            <CardHeader className="space-y-1 text-center">
                <div className="mx-auto w-16 h-16 bg-linear-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-primary/50">
                    <Lock className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                    Reset Password
                </CardTitle>
                <CardDescription className="text-slate-400">
                    Create a new password for account: <span className="text-white font-medium">{userId}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
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

                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-slate-300">
                            New Password
                        </Label>
                        <Input
                            id="newPassword"
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={loading || !!success}
                            className="bg-brand-bg-800/50 border-brand-border text-white placeholder:text-slate-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-slate-300">
                            Confirm Password
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading || !!success}
                            className="bg-brand-bg-800/50 border-brand-border text-white placeholder:text-slate-500"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-linear-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90"
                        disabled={loading || !!success}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Resetting...
                            </>
                        ) : (
                            "Set New Password"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950 p-4">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
            <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-brand-primary" />}>
                <ResetPasswordContent />
            </Suspense>
        </div>
    );
}
