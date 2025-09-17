import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

interface NetStatusProps {
    minSpeedMbps?: number; // Minimum speed in Mbps to consider as 'available'
}

const NetStatus: React.FC<NetStatusProps> = ({ minSpeedMbps = 1 }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [isSpeedLow, setIsSpeedLow] = useState(false);
    const pathname = usePathname();
    const routeStartRef = useRef<number | null>(null);
    const prevPathRef = useRef<string | null>(null);

    // Check online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Check network speed
    const checkSpeed = async () => {
        try {
            const start = Date.now();
            // Use local favicon for speed test
            const response = await fetch('/favicon-16x16.png?_=' + Date.now(), { cache: 'no-store' });
            const duration = (Date.now() - start) / 1000; // seconds
            // favicon-16x16.png is 15 KB (15 * 1024 bytes)
            const fileSizeBytes = 15 * 1024; // 15 KB = 15360 bytes
            const speedMbps = (fileSizeBytes * 8) / (duration * 1024 * 1024); // Mbps
            setIsSpeedLow(speedMbps < minSpeedMbps);
            return speedMbps;
        } catch {
            setIsSpeedLow(true);
            return 0;
        }
    };

    useEffect(() => {
        if (isOnline) {
            checkSpeed();
        }
    }, [isOnline, minSpeedMbps]);

    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (isOnline) {
            interval = setInterval(() => {
                checkSpeed();
            }, 30000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isOnline, minSpeedMbps]);

    // Monitor Next.js route changes for long bufferings using pathname
    useEffect(() => {
        if (prevPathRef.current !== null && prevPathRef.current !== pathname) {
            // Route change detected
            const start = Date.now();
            routeStartRef.current = start;
            // Wait for next tick to simulate navigation complete
            setTimeout(async () => {
                const duration = Date.now() - (routeStartRef.current || start);
                routeStartRef.current = null;
                if (duration > 2000) { // 2 seconds threshold
                    const speed = await checkSpeed();
                    if (speed < minSpeedMbps) {
                        toast.info('Navigation was slow. Your internet speed is low.');
                    }
                }
            }, 0);
        }
        prevPathRef.current = pathname;
    }, [pathname, minSpeedMbps]);

    useEffect(() => {
        if (!isOnline) {
            toast.info('No internet connection detected. Please check your network.');
        } else if (isSpeedLow) {
            toast.info('Internet connection is very slow. Some features may not work properly.');
        }
    }, [isOnline, isSpeedLow]);

    return null; // This component does not render anything
};

export default NetStatus;
