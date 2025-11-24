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
            const start = performance.now();
            // Use larger icon for more accurate speed test (112 KB)
            const response = await fetch('/icon-512x512.png?_=' + Date.now(), { cache: 'no-store' });
            
            if (!response.ok) {
                return 0;
            }
            
            const blob = await response.blob(); // Ensure full download
            const duration = (performance.now() - start) / 1000; // seconds
            
            // Use actual blob size
            const fileSizeBytes = blob.size;
            
            // Calculate speed in Mbps
            // Formula: (bytes * 8 bits/byte) / (seconds * 1,000,000 bits/Mbps)
            const speedMbps = (fileSizeBytes * 8) / (duration * 1000000);
            
            // Simple threshold check
            setIsSpeedLow(speedMbps < minSpeedMbps);
            
            return speedMbps;
        } catch (error) {
            console.error('Speed check error:', error);
            // Don't mark as slow on error
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

    // Show toast only when status changes (not on every check)
    const prevOnlineRef = useRef(isOnline);
    const prevSpeedLowRef = useRef(isSpeedLow);
    
    useEffect(() => {
        if (!isOnline && prevOnlineRef.current) {
            toast.info('No internet connection detected. Please check your network.');
        } else if (isOnline && !prevOnlineRef.current) {
            toast.success('Internet connection restored.');
        }
        prevOnlineRef.current = isOnline;
    }, [isOnline]);

    useEffect(() => {
        if (isSpeedLow && !prevSpeedLowRef.current && isOnline) {
            toast.warning('Internet connection is very slow. Some features may not work properly.');
        }
        prevSpeedLowRef.current = isSpeedLow;
    }, [isSpeedLow, isOnline]);

    return null; // This component does not render anything
};

export default NetStatus;
