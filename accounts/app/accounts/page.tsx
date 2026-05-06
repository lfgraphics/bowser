"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import { UserNav } from "@/components/UserNav";

export default function AccountantDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-8 h-8 text-brand-secondary" />
                            Accountant Dashboard
                        </h1>
                        <p className="text-slate-400 mt-1">Welcome, {session?.user?.name}</p>
                    </div>
                    <UserNav />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-brand-bg-900/50 border-brand-border backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-white">Financial Overview</CardTitle>
                            <CardDescription className="text-slate-400">
                                Manage accounts, reports, and financial data
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-slate-300">
                            <p>Accounting features coming soon...</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
