"use client";

import Loading from '@/app/loading';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker, DateTimePicker } from '@/components/ui/datetime-picker';
import { BASE_URL } from '@/lib/api';
import { TankersTrip } from '@/types';
import React from 'react'
import { toast } from 'sonner';
import { toDate } from '@/utils';

const page = ({ params }: { params: { id: string } }) => {
    const [loading, setLoading] = React.useState(false);
    const [trip, setTrip] = React.useState<TankersTrip>();
    const [isReported, setIsReported] = React.useState(false);
    const [isEnded, setIsEnded] = React.useState(false);
    const [startOdoStr, setStartOdoStr] = React.useState<string>('');
    const [endOdoStr, setEndOdoStr] = React.useState<string>('');

    const normalizeStartDate = (d?: Date) => {
        if (!d) return undefined
        const n = new Date(d)
        n.setUTCHours(0, 0, 0, 0)
        return n
    }

    const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!trip) return;
        setLoading(true);
        trip.OpretionallyModified = true;
        const url = `${BASE_URL}/trans-app/trip-update/update-trip/${trip._id}`;

        try {
            const $set: Record<string, any> = {
                OpretionallyModified: true,
            }
            const $unset: Record<string, any> = {}
            if (trip.StartDate) {
                const norm = normalizeStartDate(new Date(trip.StartDate as any))
                if (norm) $set['StartDate'] = norm
            }
            if (trip.targetTime) {
                $set['targetTime'] = trip.targetTime
            }

            $set['StartFrom'] = trip.StartFrom || ''
            $set['EndTo'] = trip.EndTo || ''
            $set['StartDriver'] = trip.StartDriver || ''
            $set['StartDriverMobile'] = trip.StartDriverMobile || ''

            if (isReported && trip.ReportingDate) {
                $set['ReportingDate'] = new Date(trip.ReportingDate as any)
            } else if (!isReported) {
                Object.assign($unset, {
                    'ReportingDate': "",
                    'LoadTripDetail.ReportDate': ""
                });
            }

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

            if (isReported && trip.LoadTripDetail?.ReportDate) {
                $set['LoadTripDetail.ReportDate'] = new Date(trip.LoadTripDetail.ReportDate as any)
            }

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

            if (Array.isArray(trip.TravelHistory)) $set['TravelHistory'] = trip.TravelHistory
            if (Array.isArray(trip.statusUpdate)) $set['statusUpdate'] = trip.statusUpdate

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
                setIsReported(Boolean(response.ReportingDate))
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
    }, []);

    return (
        <>
            {loading && <Loading />}
            {trip &&
                <div className="flex justify-center w-full">
                    <div className="w-full sm:max-w-xl py-2">
                        <div className='flex items-center justify-between'>
                            <h2 className="text-lg font-bold mb-4">Trip Edit</h2>
                            <span className={trip?.LoadStatus === 0 ? 'text-orange-400' : 'text-green-500'}>
                                {trip?.LoadStatus === 0 ? 'Empty' : 'Loaded'}
                            </span>
                        </div>
                        <div className="space-y-4">
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

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="reported"
                                    checked={isReported}
                                    onCheckedChange={(checked) => {
                                        const enabled = Boolean(checked)
                                        setIsReported(enabled);
                                        if (!enabled) {
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

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="targetTime">Target Time</Label>
                                <DateTimePicker
                                    value={toDate(trip?.targetTime)}
                                    onChange={(d) => setTrip((prev) => prev ? { ...prev, targetTime: d ? d.toISOString() as any : (undefined as any) } : prev)}
                                />
                            </div>

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

                            <div className="space-y-2">
                                <Label>Status Updates</Label>
                                <div className="space-y-2">
                                    {trip.statusUpdate && trip.statusUpdate.length > 0 ? (
                                        trip.statusUpdate.map((su, idx) => (
                                            <div key={idx} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="text-sm w-full sm:w-auto sm:flex-1">
                                                    <div><span className="text-muted-foreground">At:</span> {su.dateTime ? new Date(su.dateTime as any).toLocaleString() : '-'}</div>
                                                    <div><span className="text-muted-foreground">Status:</span> {su.status}</div>
                                                    <div className="mt-2">
                                                        <Label htmlFor={`su-comment-${idx}`}>Comment</Label>
                                                        <Input
                                                            id={`su-comment-${idx}`}
                                                            type="text"
                                                            value={su.comment ?? ''}
                                                            onChange={(e) =>
                                                                setTrip((prev) => {
                                                                    if (!prev) return prev;
                                                                    const next = { ...prev } as typeof prev;
                                                                    const list = Array.isArray(next.statusUpdate) ? [...next.statusUpdate] : [];
                                                                    const current = list[idx] ?? {} as any;
                                                                    list[idx] = { ...current, comment: e.target.value } as any;
                                                                    (next as any).statusUpdate = list as any;
                                                                    return next;
                                                                })
                                                            }
                                                        />
                                                    </div>
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

                            <div className="flex space-x-4 mt-4">
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
