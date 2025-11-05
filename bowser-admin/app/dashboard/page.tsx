"use client";
import FuelingAllocation, { SearchParams } from '@/components/FuelingAllocation';
import { InstallPrompt } from '../page';
import { useSearchParams } from 'next/navigation';
// import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Dashboard() {
    const urlSearchParams = useSearchParams();
    const searchParams: SearchParams = {
        vehicleNumber: urlSearchParams.get('vehicleNumber') || '',
        odoMeter: urlSearchParams.get('odoMeter') || '',
        tripId: urlSearchParams.get('tripId') || '',
        driverId: urlSearchParams.get('driverId') || '',
        driverName: urlSearchParams.get('driverName') || '',
        driverMobile: urlSearchParams.get('driverMobile') || '',
        id: urlSearchParams.get('id') || '',
        orderId: urlSearchParams.get('orderId') || '',
        category: (urlSearchParams.get('category') as "Own" | "Attatch" | "Bulk Sale") || "Own",
        party: urlSearchParams.get('party') || '',
        partyName: urlSearchParams.get('partyName') || '',
        odometer: urlSearchParams.get('odometer') || '',
        quantityType: (urlSearchParams.get('quantityType') as 'Full' | 'Part') || 'Full',
        fuelQuantity: urlSearchParams.get('fuelQuantity') || '',
        pumpAllocationType: (urlSearchParams.get('pumpAllocationType') as 'Any' | 'Specific') || 'Any',
        allocationType: urlSearchParams.get('allocationType') || '',
        bowserDriverName: urlSearchParams.get('bowserDriverName') || '',
        bowserDriverMobile: urlSearchParams.get('bowserDriverMobile') || '',
        bowserRegNo: urlSearchParams.get('bowserRegNo') || '',
        fuelProvider: urlSearchParams.get('fuelProvider') || '',
        petrolPump: urlSearchParams.get('petrolPump') || '',
        fuelStation: urlSearchParams.get('fuelStation') || '',
        editing: urlSearchParams.get('editing') === 'true',
    };

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
