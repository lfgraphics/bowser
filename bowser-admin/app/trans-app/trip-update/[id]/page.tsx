"use client";

import Loading from '@/app/loading';
import Combobox, { ComboboxOption } from '@/components/Combobox';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker, DateTimePicker } from '@/components/ui/datetime-picker';
import { BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { TankersTrip } from '@/types';
import React from 'react'
import { toast } from 'sonner';

const page = ({ params }: { params: { id: string } }) => {
    const [loading, setLoading] = React.useState(false);
    const [trip, setTrip] = React.useState<TankersTrip>();
    // Top-level ReportingDate toggle
    const [isReported, setIsReported] = React.useState(false);
    // Ended = if either EndDate or LoadTripDetail.UnloadDate exists
    const [isEnded, setIsEnded] = React.useState(false);
    // Odometer string values
    const [startOdoStr, setStartOdoStr] = React.useState<string>('');
    const [endOdoStr, setEndOdoStr] = React.useState<string>('');
    const [stackHolder, setStackHolder] = React.useState<string>(trip?.StartFrom || '');
    const [endStackHolder, setEndStackHolder] = React.useState<string>(trip?.EndTo || '');
    const [search, setSearch] = React.useState('');
    const [endSearch, setEndSearch] = React.useState('');
    const [stackHolders, setStackHolders] = React.useState<ComboboxOption[]>([])
    const [fullStackHolders, setFullStackHolders] = React.useState<{ _id: string, Location: string, InstitutionName: string }[]>([])

    const toDate = (d?: string | Date | null) => d ? new Date(d) : undefined

    const normalizeStartDate = (d?: Date) => {
        if (!d) return undefined
        const n = new Date(d)
        // Keep only Y/M/D but set UTCHours to 00:00 with 1s and 800ms
        n.setUTCHours(0, 0, 1, 800)
        return n
    }

    const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!trip) return;
        setLoading(true);
        trip.OpretionallyModified = true;
        const url = `${BASE_URL}/trans-app/trip-update/update-trip/${trip._id}`;

        try {
            // Build $set and $unset payload so backend can properly remove fields
            const $set: Record<string, any> = {
                OpretionallyModified: true,
            }
            const $unset: Record<string, any> = {}

            // Normalize and set StartDate if present
            if (trip.StartDate) {
                const norm = normalizeStartDate(new Date(trip.StartDate as any))
                if (norm) $set['StartDate'] = norm
            }

            // Target time
            if (trip.targetTime) {
                $set['targetTime'] = trip.targetTime
            }

            // Start From / End To / Driver / Mobile
            $set['StartFrom'] = trip.StartFrom || ''
            $set['EndTo'] = trip.EndTo || ''
            $set['StartDriver'] = trip.StartDriver || ''
            $set['StartDriverMobile'] = trip.StartDriverMobile || ''

            // ReportingDate toggle: if enabled, set; if disabled, unset
            if (isReported && trip.ReportingDate) {
                $set['ReportingDate'] = new Date(trip.ReportingDate as any)
            } else if (!isReported) {
                Object.assign($unset, {
                    'ReportingDate': "",
                    'LoadTripDetail.ReportDate': ""
                });
            }

            // EndDate and UnloadingDate should be the same and react similarly
            if (isReported && isEnded) {
                const endOrUnload = trip.EndDate || trip.LoadTripDetail?.UnloadDate
                if (endOrUnload) {
                    const d = new Date(endOrUnload as any)
                    $set['EndDate'] = d
                    $set['LoadTripDetail.UnloadDate'] = d
                }
            } else {
                $unset['EndDate'] = ""
                $unset['LoadTripDetail.UnloadDate'] = ""
            }

            // Only set LoadTripDetail.ReportDate if reported is enabled
            if (isReported && trip.LoadTripDetail?.ReportDate) {
                $set['LoadTripDetail.ReportDate'] = new Date(trip.LoadTripDetail.ReportDate as any)
            }

            // Odometer input strings -> numbers on submit (or unset if invalid/disabled)
            const startNum = Number(startOdoStr)
            if (!Number.isNaN(startNum) && startOdoStr !== '') {
                $set['TallyLoadDetail.StartOdometer'] = startNum
                $set['EmptyTripDetail.StartOdometer'] = startNum
            } else {
                $unset['TallyLoadDetail.StartOdometer'] = ""
                $unset['EmptyTripDetail.StartOdometer'] = ""
            }

            const endNum = Number(endOdoStr)
            if (isEnded && !Number.isNaN(endNum) && endOdoStr !== '') {
                $set['TallyLoadDetail.EndOdometer'] = endNum
                $set['EmptyTripDetail.EndOdometer'] = endNum
            } else {
                $unset['TallyLoadDetail.EndOdometer'] = ""
                $unset['EmptyTripDetail.EndOdometer'] = ""
            }

            // Persist deletions/edits of arrays
            if (Array.isArray(trip.TravelHistory)) $set['TravelHistory'] = trip.TravelHistory
            if (Array.isArray(trip.statusUpdate)) $set['statusUpdate'] = trip.statusUpdate

            // Resolve conflicts: if a key exists in both $set and $unset, drop it from $set
            for (const k of Object.keys($unset)) {
                if (k in $set) delete $set[k]
            }

            const updatePayload: any = {}
            if (Object.keys($set).length) updatePayload['$set'] = $set
            if (Object.keys($unset).length) updatePayload['$unset'] = $unset

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatePayload),
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
                // Initialize toggles based on existing data
                setIsReported(Boolean(response.ReportingDate))
                // End considered true if either EndDate or UnloadDate exists
                setIsEnded(Boolean(response.EndDate || response?.LoadTripDetail?.UnloadDate))
                const sOdo = response?.TallyLoadDetail?.StartOdometer ?? response?.EmptyTripDetail?.StartOdometer
                const eOdo = response?.TallyLoadDetail?.EndOdometer ?? response?.EmptyTripDetail?.EndOdometer
                setStartOdoStr(sOdo !== undefined && sOdo !== null ? String(sOdo) : '')
                setEndOdoStr(eOdo !== undefined && eOdo !== null ? String(eOdo) : '')
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
                <div className="flex justify-center w-full">
                    <div className="w-full sm:max-w-xl py-2">
                        <h2 className="text-lg font-bold mb-4">Trip Edit</h2>
                        <div className="space-y-4">
                            {/* Start Date (date-only; UTC seconds=1, ms=800) */}
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <DatePicker
                                    value={toDate(trip?.StartDate)}
                                    onChange={(d) => {
                                        const normalized = d ? normalizeStartDate(d) : undefined
                                        setTrip((prev) => prev ? { ...prev, StartDate: normalized?.toISOString() as any } : prev)
                                    }}
                                />
                            </div>

                            {/* Start Odometer (string) */}
                            <div>
                                <Label htmlFor="startOdometer">Start Odometer</Label>
                                <Input
                                    id="startOdometer"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 123456"
                                    value={startOdoStr}
                                    onChange={(e) => setStartOdoStr(e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>

                            {/* Report Date (top-level ReportingDate) */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="reported"
                                    checked={isReported}
                                    onCheckedChange={(checked) => {
                                        const enabled = Boolean(checked)
                                        setIsReported(enabled);
                                        if (!enabled) {
                                            // do not keep value; will be $unset on submit
                                            setTrip((prev) => prev ? { ...prev, ReportingDate: undefined as any } : prev)
                                        } else {
                                            setTrip((prev) => prev ? { ...prev, ReportingDate: (prev.ReportingDate ? prev.ReportingDate : new Date()) as any } : prev)
                                        }
                                    }}
                                />
                                <Label htmlFor="reported">Reported</Label>
                                <div className="flex-1">
                                    <DatePicker
                                        value={isReported ? toDate(trip.ReportingDate) ?? new Date() : undefined}
                                        onChange={(d) => setTrip((prev) => prev ? { ...prev, ReportingDate: d ? d.toISOString() as any : (undefined as any) } : prev)}
                                    />
                                </div>
                            </div>

                            {/* End/Unload Date (single control; both fields sync) */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    disabled={!isReported}
                                    id="ended"
                                    checked={isEnded}
                                    onCheckedChange={(checked) => {
                                        const enabled = Boolean(checked)
                                        setIsEnded(enabled)
                                        if (!enabled) setTrip((prev) => prev ? { ...prev, EndDate: undefined as any, LoadTripDetail: { ...prev.LoadTripDetail, UnloadDate: undefined as any } } : prev)
                                        else setTrip((prev) => {
                                            if (!prev) return prev
                                            const existing = (prev.EndDate as any) || (prev.LoadTripDetail?.UnloadDate as any) || new Date().toISOString()
                                            return { ...prev, EndDate: existing as any, LoadTripDetail: { ...prev.LoadTripDetail, UnloadDate: existing as any } }
                                        })
                                    }}
                                />
                                <Label htmlFor="ended">Ended (End/Unload Date)</Label>
                                <div className="flex-1">
                                    <DatePicker
                                        value={isEnded ? (toDate(trip?.EndDate) || toDate(trip?.LoadTripDetail?.UnloadDate) || new Date()) : undefined}
                                        onChange={(d) => setTrip((prev) => prev ? {
                                            ...prev,
                                            EndDate: d ? d.toISOString() as any : (undefined as any),
                                            LoadTripDetail: { ...prev.LoadTripDetail, UnloadDate: d ? d.toISOString() as any : (undefined as any) }
                                        } : prev)}
                                    />
                                </div>
                            </div>

                            {/* End Odometer (string; enabled when Ended) */}
                            <div>
                                <Label htmlFor="endOdometer">End Odometer</Label>
                                <Input
                                    id="endOdometer"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 123789"
                                    disabled={!isEnded}
                                    value={endOdoStr}
                                    onChange={(e) => setEndOdoStr(e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>

                            {/* Start From / End To */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="startFrom">Start From</Label>
                                    <Input
                                        id="startFrom"
                                        type="text"
                                        value={trip?.StartFrom || ''}
                                        onChange={(e) => setTrip((prev) => prev ? { ...prev, StartFrom: e.target.value } : prev)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="endTo">End To</Label>
                                    <Input
                                        id="endTo"
                                        type="text"
                                        value={trip?.EndTo || ''}
                                        onChange={(e) => setTrip((prev) => prev ? { ...prev, EndTo: e.target.value } : prev)}
                                    />
                                </div>
                            </div>

                            {/* Start Driver / Mobile */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="startDriver">Start Driver</Label>
                                    <Input
                                        id="startDriver"
                                        type="text"
                                        value={trip?.StartDriver || ''}
                                        onChange={(e) => setTrip((prev) => prev ? { ...prev, StartDriver: e.target.value } : prev)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="startDriverMobile">Driver Mobile</Label>
                                    <Input
                                        id="startDriverMobile"
                                        type="tel"
                                        value={trip?.StartDriverMobile || ''}
                                        onChange={(e) => setTrip((prev) => prev ? { ...prev, StartDriverMobile: e.target.value } : prev)}
                                    />
                                </div>
                            </div>

                            {/* Target Time (Date & Time) */}
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="targetTime">Target Time</Label>
                                <DateTimePicker
                                    value={toDate(trip?.targetTime)}
                                    onChange={(d) => setTrip((prev) => prev ? { ...prev, targetTime: d ? d.toISOString() as any : (undefined as any) } : prev)}
                                />
                            </div>

                            {/* Unloading Date control removed: it mirrors End Date automatically */}

                            {/* Travel History - delete rows */}
                            <div className="space-y-2">
                                <Label>Travel History</Label>
                                <div className="space-y-2">
                                    {trip.TravelHistory && trip.TravelHistory.length > 0 ? (
                                        trip.TravelHistory.map((th, idx) => (
                                            <div key={idx} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="text-sm">
                                                    <div><span className="text-muted-foreground">On:</span> {th.TrackUpdateDate ? new Date(th.TrackUpdateDate).toLocaleString() : '-'}</div>
                                                    <div><span className="text-muted-foreground">At:</span> {th.LocationOnTrackUpdate || '-'}</div>
                                                    <div><span className="text-muted-foreground">Odo:</span> {th.OdometerOnTrackUpdate ?? '-'}</div>
                                                    {th.ManagerComment && <div><span className="text-muted-foreground">Comment:</span> {th.ManagerComment}</div>}
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => setTrip((prev) => prev ? { ...prev, TravelHistory: prev.TravelHistory.filter((_, i) => i !== idx) } : prev)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-muted-foreground">No travel history</div>
                                    )}
                                </div>
                            </div>

                            {/* Status Updates - delete rows */}
                            <div className="space-y-2">
                                <Label>Status Updates</Label>
                                <div className="space-y-2">
                                    {trip.statusUpdate && trip.statusUpdate.length > 0 ? (
                                        trip.statusUpdate.map((su, idx) => (
                                            <div key={idx} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="text-sm">
                                                    <div><span className="text-muted-foreground">At:</span> {su.dateTime ? new Date(su.dateTime as any).toLocaleString() : '-'}</div>
                                                    <div><span className="text-muted-foreground">Status:</span> {su.status}</div>
                                                    {su.comment && <div><span className="text-muted-foreground">Comment:</span> {su.comment}</div>}
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => setTrip((prev) => prev ? { ...prev, statusUpdate: prev.statusUpdate.filter((_, i) => i !== idx) } : prev)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-muted-foreground">No status updates</div>
                                    )}
                                </div>
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
                    </div>
                </div>
            }
        </>
    );
}

export default page
