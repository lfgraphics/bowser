"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import FuelingAllocation from '@/components/FuelingAllocation';
import Loading from '../loading';
import { InstallPrompt } from '../page';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Dashboard() {
    const router = useRouter();
    const [authChecked, setAuthChecked] = useState(false);
    const [alertDialogOpen, setAlertDialogOpen] = useState(true);
    const [alertMessage, setAlertMessage] = useState("");

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
            {/* <PushNotificationManager /> */}
            <InstallPrompt />
            <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                <AlertDialogContent className='bg-red-600 text-white'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Important notice</AlertDialogTitle>
                        <AlertDialogDescription className='text-white'>
                            Currently this page is under necessary Update and won't work as expected
                            <br />Please use wahtsapp or other methods for fueling orders
                            <br />We'll notify you through a push notification as soon as it starts working
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => {
                            setAlertDialogOpen(false);
                        }}>
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
