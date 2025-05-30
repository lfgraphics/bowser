"use client";
import FuelingAllocation, { SearchParams } from '@/components/FuelingAllocation';
import { InstallPrompt } from '../page';
// import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Dashboard({ searchParams }: { searchParams: SearchParams }) {

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
