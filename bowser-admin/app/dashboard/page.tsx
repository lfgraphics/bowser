"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import FuelingAllocation from '@/components/FuelingAllocation';
import Loading from '../loading';

export default function Dashboard() {
    const router = useRouter();
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const authenticated = await isAuthenticated();
            if (!authenticated) {
                router.push('/login');
            }
            setAuthChecked(true);
        };

        checkAuth();
    }, [router]);

    if (!authChecked) {
        return <Loading />;
    }

    return (
        <div>
            <FuelingAllocation />
        </div>
    );
}
