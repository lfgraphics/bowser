"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const errorParam = searchParams.get("error");

    const getErrorMessage = (code: string | null) => {
        if (!code) return "";
        const errorMap: Record<string, string> = {
            CredentialsSignin: "Invalid User ID or password.",
            CallbackRouteError: "Invalid User ID or password.",
            Configuration: "Server configuration error. Please contact admin.",
            AccessDenied: "Access denied. You don't have permission.",
            "session-expired": "Your session has expired. Please login again.",
            "SessionExpired": "Your session has expired. Please login again.",
            Default: "An unexpected error occurred. Please try again.",
        };
        return errorMap[code] || errorMap.Default;
    };

    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(getErrorMessage(errorParam));
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                userId,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(getErrorMessage(result.error));
            } else {
                // Successful login - redirect to callback URL or dashboard
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950 p-4">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
            
            <Card className="w-full max-w-md relative z-10 shadow-2xl glass-card overflow-hidden">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto w-16 h-16 bg-linear-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-primary/50">
                        <svg
                            className="w-10 h-10 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                    <CardTitle className="text-3xl font-bold bg-linear-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
                        Welcome Back
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Sign in to access your account
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

                        <div className="space-y-2">
                            <Label htmlFor="userId" className="text-slate-300">
                                User ID
                            </Label>
                            <Input
                                id="userId"
                                type="text"
                                placeholder="Enter your user ID"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-brand-bg-800/50 border-brand-border text-white placeholder:text-slate-500 focus:border-brand-primary focus:ring-brand-primary/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-slate-300">
                                    Password
                                </Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="bg-brand-bg-800/50 border-brand-border text-white placeholder:text-slate-500 focus:border-brand-primary focus:ring-brand-primary/20 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-linear-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90 text-white font-semibold py-6 rounded-lg shadow-lg shadow-brand-primary/30 transition-all duration-300 hover:shadow-brand-primary/50 hover:scale-[1.02]"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-400">
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-brand-primary hover:text-brand-primary/80 font-semibold transition-colors">
                            Sign up
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
