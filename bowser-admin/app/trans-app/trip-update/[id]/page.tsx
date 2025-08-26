"use client";

import Loading from '@/app/loading';
import Combobox, { ComboboxOption } from '@/components/Combobox';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { TankersTrip } from '@/types';
import React from 'react'
import { toast } from 'sonner';

const page = ({ params }: { params: { id: string } }) => {
    const [loading, setLoading] = React.useState(false);
    const [trip, setTrip] = React.useState<TankersTrip>();
    const [isReported, setIsReported] = React.useState(false);
    const [isEnded, setIsEnded] = React.useState(false);
    const [stackHolder, setStackHolder] = React.useState<string>(trip?.StartFrom || '');
    const [endStackHolder, setEndStackHolder] = React.useState<string>(trip?.EndTo || '');
    const [search, setSearch] = React.useState('');
    const [endSearch, setEndSearch] = React.useState('');
    const [stackHolders, setStackHolders] = React.useState<ComboboxOption[]>([])
    const [fullStackHolders, setFullStackHolders] = React.useState<{ _id: string, Location: string, InstitutionName: string }[]>([])

    const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!trip) return;
        setLoading(true);
        trip.OpretionallyModified = true;
        const url = `${BASE_URL}/trans-app/trip-update/update-trip/${trip._id}`;

        try {
            const updatedTrip = {
                ...(trip as any),
                OpretionallyModified: true,
                LoadTripDetail: {
                    ...((trip?.LoadTripDetail && !isEnded) ? 
                        // If not ended, remove UnloadDate field
                        Object.fromEntries(Object.entries(trip.LoadTripDetail).filter(([key]) => key !== 'UnloadDate')) 
                        : trip?.LoadTripDetail || {}),
                    ...(isReported ? { ReportDate: trip?.LoadTripDetail?.ReportDate } : { ReportDate: null }),
                    ...(isEnded ? { UnloadDate: trip?.LoadTripDetail?.UnloadDate } : {}),
                },
            } as unknown as TankersTrip;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedTrip),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to submit trip update:", errorText);
                toast.error("Failed to submit trip update: ", { description: errorText, richColors: true });
                return;
            }
            toast.success("Trip update submitted successfully!", { richColors: true });
        } catch (error) {
            console.error("Error submitting trip update:", error);
            toast.error("An error occurred while submitting the trip update.", { richColors: true });
        } finally {
            setLoading(false)
        }
    };

    React.useEffect(() => {
        const fetchRecord = async () => {
            setLoading(true)
            try {
                const request = await fetch(`${BASE_URL}/trans-app/vehicles/get-trip-by-id/${params.id}`);
                if (!request.ok) {
                    const errorData = await request.json();
                    toast.error('Error fetching record', { description: errorData.error, richColors: true });
                }
                const response = await request.json()
                setTrip(response);
                console.log(response)
            } catch (error) {
                console.error('Error fetching records:', error);
            } finally {
                setLoading(false)
            }
        };
        fetchRecord();
        fetchStackHolders();
    }, []);

    const fetchStackHolders = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${BASE_URL}/trans-app/stack-holders?params=${search}`);
            const data = await response.json();
            const formattedData: ComboboxOption[] = data.map((item: { _id: string, InstitutionName: string }) => ({
                value: item._id,
                label: item.InstitutionName
            }));
            setStackHolders(formattedData);
            setFullStackHolders(data);
            console.log(data)
        } catch (error) {
            console.error('Error fetching fuel providers:', error);
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchStackHolders();
    }, [search]);

    React.useEffect(() => {
        setStackHolder(trip?.StartFrom || '');
        setEndStackHolder(trip?.EndTo || '');
        console.log('trip changed', trip)
    }, [trip])

    return (
        <>
            {loading && <Loading />}
            {trip &&
                <div className="p-4">
                    <h2 className="text-lg font-bold mb-4">Trip Edit</h2>
                    <div className="space-y-4">
                        {/* Start Date */}
                        <div>
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                                id="startDate"
                                type="date"
                                onChange={(e) => {
                                    setTrip((prev) =>
                                        prev ? { ...prev, StartDate: e.target.value } : prev
                                    )
                                }}
                                value={trip?.StartDate ? new Date(trip.StartDate).toISOString().split('T')[0] : ''}
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        {/* Start Odometer */}
                        <div>
                            <Label htmlFor="startOdometer">Start Odometer</Label>
                            <Input
                                id="startOdometer"
                                type="number"
                                value={trip?.TallyLoadDetail?.StartOdometer || trip?.EmptyTripDetail?.StartOdometer}
                                onChange={(e) => setTrip((prev) =>
                                    prev ? { ...prev, TallyLoadDetail: { ...prev.TallyLoadDetail, StartOdometer: parseInt(e.target.value) }, EmptyTripDetail: { ...prev.EmptyTripDetail, StartOdometer: parseInt(e.target.value) } } : prev)}
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        {/* Start Location */}
                        {/* <div>
                            <Label htmlFor="startLocation">Start Location</Label>
                            <Combobox
                                className={`${!stackHolder ? 'bg-yellow-100' : ''} w-full p-2 border rounded`}
                                options={stackHolders}
                                value={stackHolder}
                                onChange={setStackHolder}
                                searchTerm={search}
                                onSearchTermChange={setSearch}
                                placeholder="Select Location"
                            />
                        </div> */}

                        {/* End Destination */}
                        {/* <div>
                            <Label htmlFor="endDestination">End Destination</Label>
                            <Combobox
                                className={`${!endStackHolder ? 'bg-yellow-100' : ''} w-full p-2 border rounded`}
                                options={stackHolders}
                                value={endStackHolder}
                                onChange={setEndStackHolder}
                                searchTerm={endSearch}
                                onSearchTermChange={setEndSearch}
                                placeholder="Select Destination"
                            />
                        </div> */}

                        {/* Report Date */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="reported"
                                checked={isReported}
                                onCheckedChange={(checked) => {
                                    setIsReported(checked as boolean);
                                    if (!checked) trip.LoadTripDetail.ReportDate = null;
                                    else trip.LoadTripDetail.ReportDate = new Date();
                                    setTrip({ ...trip });
                                }}
                            />
                            <Label htmlFor="reported">Reported</Label>
                            <Input
                                id="reportDate"
                                type="date"
                                disabled={!isReported}
                                value={isReported ? (trip.LoadTripDetail.ReportDate ? new Date(trip.LoadTripDetail.ReportDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]) : ''}
                                onChange={(e) => {
                                    trip.LoadTripDetail.ReportDate = e.target.value ? new Date(e.target.value) : null;
                                    setTrip({ ...trip });
                                }}
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        {/* End Date */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="ended"
                                checked={isEnded}
                                onCheckedChange={(checked) => {
                                    setIsEnded(checked as boolean);
                                    if (!checked) trip.LoadTripDetail.UnloadDate = null;
                                    else trip.LoadTripDetail.UnloadDate = new Date();
                                    setTrip({ ...trip });
                                }}
                            />
                            <Label htmlFor="ended">Ended</Label>
                            <Input
                                id="endDate"
                                type="date"
                                disabled={!isEnded}
                                value={isEnded ? (trip.LoadTripDetail.UnloadDate ? new Date(trip.LoadTripDetail.UnloadDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]) : ''}
                                onChange={(e) => {
                                    trip.LoadTripDetail.UnloadDate = e.target.value ? new Date(e.target.value) : null;
                                    setTrip({ ...trip });
                                }}
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        {/* End Odometer */}
                        <div>
                            <Label htmlFor="endOdometer">End Odometer</Label>
                            <Input
                                id="endOdometer"
                                type="number"
                                value={trip?.TallyLoadDetail?.EndOdometer || trip?.EmptyTripDetail?.EndOdometer}
                                onChange={(e) => setTrip((prev) =>
                                    prev ? { ...prev, TallyLoadDetail: { ...prev.TallyLoadDetail, EndOdometer: parseInt(e.target.value) }, EmptyTripDetail: { ...prev.EmptyTripDetail, EndOdometer: parseInt(e.target.value) } } : prev)}
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex space-x-4 mt-4">
                            {/* <Button variant="outline" onClick={() => console.log('Cancel')}>
                                Cancel
                            </Button> */}
                            <Button variant="default" className='w-full' onClick={(e) => handleSave(e)}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>}
        </>
    );
}

export default page
