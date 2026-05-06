"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
    User, 
    LogOut, 
    Settings, 
    ChevronDown,
    LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export function UserNav() {
    const { data: session } = useSession();
    const router = useRouter();

    if (!session?.user) return null;

    const user = session.user;

    const getDashboardRoute = () => {
        const routes: Record<string, string> = {
            admin: "/admin",
            grManager: "/gr",
            cashierAdmin: "/cashier",
            tempCashier: "/cashier",
            accountant: "/accounts",
        };
        return routes[user.role as string] || "/";
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-auto px-2 flex items-center gap-2 hover:bg-brand-bg-800 focus-visible:ring-0">
                    <div className="h-8 w-8 rounded-full bg-linear-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-semibold">
                        {user.name?.[0].toUpperCase() || "U"}
                    </div>
                    <div className="hidden md:flex flex-col items-start text-sm">
                        <span className="text-white font-medium leading-none">{user.name}</span>
                        <span className="text-slate-400 text-xs mt-1">{user.role}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-brand-bg-900 border-brand-border text-white" align="end">
                <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none text-white">{user.name}</p>
                    <p className="text-xs leading-none text-slate-400 truncate mt-1">
                        {user.email || user.userId}
                    </p>
                </div>
                <Separator className="my-2 bg-brand-border" />
                <div className="flex flex-col gap-1">
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start text-slate-300 hover:text-white hover:bg-brand-bg-800 h-9"
                        onClick={() => router.push(getDashboardRoute())}
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start text-slate-300 hover:text-white hover:bg-brand-bg-800 h-9"
                        onClick={() => router.push("/profile")}
                    >
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start text-slate-300 hover:text-white hover:bg-brand-bg-800 h-9"
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </Button>
                </div>
                <Separator className="my-2 bg-brand-border" />
                <Button 
                    variant="ghost" 
                    className="w-full justify-start text-brand-danger hover:text-brand-danger/80 hover:bg-brand-danger/10 h-9"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </Button>
            </PopoverContent>
        </Popover>
    );
}
