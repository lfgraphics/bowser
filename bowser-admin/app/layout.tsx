"use client"
import { ThemeProvider } from "@/components/theme-provider"
import { useEffect, useState } from 'react';
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from '@/components/layout/Sidebar';
import { isAuthenticated } from '@/lib/auth';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setIsAuth(isAuthenticated());
  }, []);

  return (
    <html lang="en" className={inter.className}>
      <body className={`${inter.className} dark:bg-background dark:text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {isAuth && <Sidebar />}
          <div className={`min-h-screen ${isAuth ? 'md:pl-60' : ''}`}>
            <main className="p-4 md:p-8 pt-14">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
