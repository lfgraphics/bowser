"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import FuelingAllocation from '@/components/FuelingAllocation';
import Loading from '../loading';
import { InstallPrompt } from '../page';
// import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Dashboard({ searchParams }: { searchParams: { vehicleNumber: string, driverId: string, driverName: string, driverMobile: string, id: string } }) {

    return (
        <div>
            <FuelingAllocation searchParams={searchParams} />
            {/* <PushNotificationManager /> */}
            <InstallPrompt />
            {/* <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
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
            </AlertDialog> */}
        </div>
    );
}
