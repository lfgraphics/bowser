"use client"
import { ThemeProvider } from "@/components/theme-provider"
import { useEffect, useState } from 'react';
import { Inter } from "next/font/google";
import "./globals.css";
import "./loading";
import { CacheProvider } from '@/src/context/CacheContext'
import { Sidebar } from '@/components/layout/Sidebar';
import { isAuthenticated } from '@/lib/auth';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { usePathname } from 'next/navigation';
import { Toaster } from "sonner";
import { VehiclesCacheProvider } from "@/src/context/VehiclesCacheContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isAuth, setIsAuth] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsAuth(isAuthenticated());
  }, [pathname]);

  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className={`dark:bg-background dark:text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {isAuth && <Sidebar />}
          <div className={`h-[96svh]`}>
            <Toaster richColors closeButton position="bottom-center"/>
            <CacheProvider>
              <VehiclesCacheProvider>
                {children}
              </VehiclesCacheProvider>
            </CacheProvider>
            <SpeedInsights />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
