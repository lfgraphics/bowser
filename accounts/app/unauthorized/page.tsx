"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950 p-4">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
            
            <Card className="w-full max-w-md relative z-10 shadow-2xl border-brand-border bg-brand-bg-900/50 backdrop-blur-xl">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-20 h-20 bg-brand-danger/10 rounded-full flex items-center justify-center border border-brand-danger/30 shadow-lg shadow-brand-danger/10">
                        <ShieldAlert className="w-10 h-10 text-brand-danger" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white mb-2">
                            Access Denied
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <Button 
                        onClick={() => router.back()}
                        className="w-full bg-brand-bg-800 hover:bg-slate-700 text-white"
                        variant="outline"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                    <Link href="/login">
                        <Button className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white">
                            Back to Login
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
