"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    User, 
    Mail, 
    Lock, 
    Shield, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserNav } from "@/components/UserNav";
import { Separator } from "@/components/ui/separator";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function ProfilePage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (session?.user) {
            setName(session.user.name || "");
            setEmail(session.user.email || "");
        }
    }, [status, session, router]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setIsLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/account-auth/users/${session?.user?.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify({ name, email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update profile");
            }

            setSuccess("Profile updated successfully");
            // Refresh session to reflect changes
            await update({ name, email });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters long");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/account-auth/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify({
                    userId: session?.user?.userId,
                    currentPassword,
                    newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to change password");
            }

            setSuccess("Password changed successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-bg-900">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950">
            {/* Top Bar */}
            <div className="border-b border-brand-border bg-brand-bg-900/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-white"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-xl font-semibold text-white">Profile Management</h1>
                    </div>
                    <UserNav />
                </div>
            </div>

            <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* User Info Sidebar */}
                    <div className="md:col-span-1 space-y-6">
                        <Card className="bg-brand-bg-900/50 border-brand-border">
                            <CardContent className="pt-6 text-center">
                                <div className="mx-auto w-24 h-24 rounded-full bg-linear-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg shadow-brand-primary/20">
                                    {session?.user?.name?.[0].toUpperCase()}
                                </div>
                                <h2 className="text-xl font-bold text-white">{session?.user?.name}</h2>
                                <p className="text-slate-400 text-sm mt-1">{session?.user?.role}</p>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <span className="px-2 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs border border-brand-primary/20">
                                        ID: {session?.user?.userId}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-8">
                        {/* Profile Details */}
                        <Card className="bg-brand-bg-900/50 border-brand-border">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <User className="w-5 h-5 text-brand-primary" />
                                    Account Details
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Update your personal information
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">User ID</Label>
                                        <Input
                                            value={session?.user?.userId || ""}
                                            disabled
                                            className="bg-brand-bg-800/50 border-brand-border text-slate-500"
                                        />
                                        <p className="text-xs text-slate-500 italic">User ID cannot be changed</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Full Name</Label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="bg-brand-bg-800 border-brand-border text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Email Address</Label>
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-brand-bg-800/50 border-brand-border text-white"
                                        />
                                    </div>
                                    <Button type="submit" disabled={isLoading} className="bg-brand-primary hover:bg-brand-primary/90 mt-2">
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Update Profile
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Security Section */}
                        <Card className="bg-brand-bg-900/50 border-brand-border">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-brand-secondary" />
                                    Security
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Change your account password
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Current Password</Label>
                                        <Input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            required
                                            className="bg-brand-bg-800 border-brand-border text-white"
                                        />
                                    </div>
                                    <Separator className="bg-brand-border my-4" />
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">New Password</Label>
                                        <Input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            placeholder="Min 6 characters"
                                            className="bg-brand-bg-800/50 border-brand-border text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Confirm New Password</Label>
                                        <Input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="bg-brand-bg-800/50 border-brand-border text-white"
                                        />
                                    </div>
                                    <Button type="submit" disabled={isLoading} className="bg-brand-secondary hover:bg-brand-secondary/90 mt-2">
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Change Password
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
