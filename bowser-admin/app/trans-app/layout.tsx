"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    FileDown,
    FileUp,
    AudioWaveform,
    Home,
} from "lucide-react";
import { TransAppUser } from "@/types";


export const TransAppContext = createContext<{
    user: TransAppUser | null;
    photo: TransAppUser["Photo"] | undefined;
}>({
    user: null,
    photo: undefined,
});

export default function TransAppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<TransAppUser | null>(null);
    const [photo, setPhoto] = useState<TransAppUser["Photo"] | undefined>();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedUser = localStorage.getItem("adminUser");
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                setPhoto(parsed.Photo);
            } else {
                router.push("/login");
            }
        }
    }, []);

    const navItems = [
        {
            label: "Home",
            href: "/trans-app",
            icon: <Home className="mr-2 w-4 h-4" />,
        },
        {
            label: "Unloading Tracker",
            href: "/trans-app/unloading-tracker",
            icon: <FileDown className="mr-2 w-4 h-4" />,
        },
        {
            label: "Loading Planner",
            href: "/trans-app/loading-planner",
            icon: <FileUp className="mr-2 w-4 h-4" />,
        },
        {
            label: "Loading Tracker",
            href: "/trans-app/loading-tracker",
            icon: <AudioWaveform className="mr-2 w-4 h-4" />,
        },
    ];

    return (
        <TransAppContext.Provider value={{ user, photo }}>
            <div className="md:h-[96.5svh] flex flex-col">
                <main className="md:flex-1 md:overflow-auto p-4">{children}</main>
                <div className="bg-muted p-2 md:flex gap-0 border-b sticky bottom-0 hidden ">
                    {navItems.map(({ href, label, icon }) => (
                        <Link key={href} href={href}>
                            <Button
                                disabled
                                variant={pathname === href ? "default" : "ghost"}
                                className="rounded-none px-4"
                            >
                                {icon}
                                {label}
                            </Button>
                        </Link>
                    ))}
                </div>
            </div>
        </TransAppContext.Provider>
    );
}
