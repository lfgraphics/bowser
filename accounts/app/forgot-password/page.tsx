"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function ForgotPasswordPage() {
    const [userId, setUserId] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [devLink, setDevLink] = useState("");

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setDevLink("");
        setLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/account-auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Failed to request password reset");
                return;
            }

            setSuccess(data.message);
            if (data.devLink) {
                setDevLink(data.devLink);
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
                <CardHeader className="space-y-1">
                    <Link
                        href="/login"
                        className="inline-flex items-center text-sm text-slate-400 hover:text-slate-300 transition-colors mb-2"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to login
                    </Link>
                    <CardTitle className="text-2xl font-bold text-white">
                        Forgot Password
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Enter your user ID/Email to receive a password reset link
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRequestReset} className="space-y-4">
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

                        {devLink && (
                            <Alert className="bg-brand-primary/10 border-brand-primary/50 text-brand-primary wrap-break-word">
                                <AlertDescription>
                                    <span className="font-bold">Dev Mode Link:</span>
                                    <br />
                                    <Link href={devLink} className="underline hover:text-brand-primary/80">
                                        Click here to reset password
                                    </Link>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="userId" className="text-slate-300">
                                User ID / Email
                            </Label>
                            <Input
                                id="userId"
                                type="text"
                                placeholder="Enter your user ID or Email"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                required
                                disabled={loading || !!success}
                                className="bg-brand-bg-800/50 border-brand-border text-white placeholder:text-slate-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-linear-to-r from-brand-primary to-brand-secondary hover:from-blue-700 hover:to-purple-700"
                            disabled={loading || !!success}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending Link...
                                </>
                            ) : (
                                "Send Reset Link"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
