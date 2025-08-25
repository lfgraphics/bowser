import Loading from '@/app/loading';
import { BASE_URL } from '@/lib/api'
import { TankersTrip, TransAppUser, TripsSummary, TripStatusUpdateEnums, tripStatusUpdateVars } from '@/types'
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDate } from '@/lib/utils';
import { generateTripsReport } from "@/utils/excel";
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Eye } from 'lucide-react';

type TripBase = {
    _id: string;
    LoadStatus: number;
    StartDate: string;
    targetTime: string;
    StartDriver: string;
    StartDriverMobile: string;
    LoadTripDetail: {
        LoadDate: string;
        SupplyFrom: string;
        ShipTo: string;
        NameOfGoods: string;
        LoadDetail: {
            LoadQty: number;
            UnloadQty: number;
            ShortQty: number;
        };
        UnloadDate: string
        ReportDate: string
    };
    TravelHistory: {
        TrackUpdateDate: Date;
        LocationOnTrackUpdate: string;
        OdometerOnTrackUpdate: number;
        ManagerComment: string;
        Driver: string;
    }[];
    VehicleNo: string;
    StartFrom?: string;
    EndTo: string;
    superwiser?: string;
    statusUpdate: {
        dateTime: string;
        user: {
            _id: string;
            name: string
        },
        status: TripStatusUpdateEnums;
        comment?: string
    }[]
};

type LoadedTrip = TripBase & {
    TallyLoadDetail?: {
        Consignor: string;
        ReportedDate: string;
    };
};

type EmptyTrip = TripBase & {
    EmptyTripDetail?: {
        ReportDate: string;
    };
};

type TripStatus = "On Way" | "Reported" | "Standing" | "In Distillery" | "Loaded" | "Unloaded";

type GroupedTrip = (LoadedTrip | EmptyTrip) & {
    status: TripStatus;
};

type TripData = {
    onWay?: { count: number; trips: (LoadedTrip | EmptyTrip)[] };
    reported?: { count: number; trips: (LoadedTrip | EmptyTrip)[] };
    standing?: { count: number; trips: (LoadedTrip | EmptyTrip)[] };
};

type VehicleData = {
    loaded?: TripData;
    empty?: TripData;
};

type Props = {
    data: VehicleData;
    setSelectedTripId: (id: string) => void;
};


const VehiclesSummary = () => {
    const [user, setUser] = useState<TransAppUser>();
    const [loading, setLoading] = useState<boolean>(true)
    const [data, setData] = useState<TripsSummary>();
    const [statusUpdate, setStatusUpdate] = useState<{ tripId: string, status: TripStatusUpdateEnums, comment?: string } | null>(null)
    const [filter, setFilter] = useState<'all' | 'loadedOnWay' | 'loadedReported' | 'emptyOnWay' | 'emptyReported' | 'emptyStanding'>('all')
    const [viewingTrip, setViewingTrip] = useState<string | null>(null)

    useEffect(() => {
        if (viewingTrip == null) return

        // Push a fake state when drawer/trip is opened
        const state = { drawer: true }
        window.history.pushState(state, "")

        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.drawer) {
                // Instead of navigating, just close the drawer
                setViewingTrip(null)
            }
        }

        window.addEventListener("popstate", handlePopState)

        return () => {
            window.removeEventListener("popstate", handlePopState)
            // Optional: when closing manually, clean up one fake state
            if (window.history.state?.drawer) {
                window.history.back()
            }
        }
    }, [viewingTrip])

    useEffect(() => {
        let user = localStorage.getItem("adminUser")
        let jsonUser: TransAppUser = JSON.parse(user!)
        setUser(jsonUser)
    }, [])

    const fetchSummary = async () => {
        if (!user?._id) return
        try {
            setLoading(true)
            const url = `${BASE_URL}/trans-app/vehicles/get-summary/${user?._id}?isAdmin${user?.Division === "EthanolAdmin"}`
            const summary = await fetch(url);
            const jsonSummary = await summary.json()
            setData(jsonSummary);
            console.log(jsonSummary);
        } catch (error) {
            console.error(error)
            toast.error("Error", { description: String(error), richColors: true })
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        fetchSummary()
    }, [user?._id])

    const handleDownload = () => {
        generateTripsReport({
            summary: data!,
            username: user!.name,
            isAdmin: user?.Division === "EthanolAdmin",
            fileName: `Tankers_Report_Generated_at_${formatDate(new Date())}_by_${user?.name}.xlsx`,
        });
    };

    const findTripById = (tripId: string): TankersTrip => {
        const allTrips = [
            ...(data?.loaded?.onWay?.trips ?? []),
            ...(data?.loaded?.reported?.trips ?? []),
            ...(data?.empty?.onWay?.trips ?? []),
            ...(data?.empty?.standing?.trips ?? []),
            ...(data?.empty?.reported?.trips ?? [])
        ];

        return allTrips.find(trip => trip._id === tripId)!;
    }

    function groupTripsByEndTo(data: TripData | undefined, type: "loaded" | "empty") {
        const grouped: Record<string, GroupedTrip[]> = {};

        if (!data) return grouped;

        const statuses: { key: keyof TripData; label: TripStatus }[] = [
            { key: "onWay", label: "On Way" },
            { key: "reported", label: "Reported" },
            { key: "standing", label: "Standing" },
        ];

        statuses.forEach(({ key, label }) => {
            const statusData = data[key];
            if (statusData?.trips?.length) {
                statusData.trips.forEach((trip) => {
                    const endTo = trip.EndTo || "Unknown";
                    if (!grouped[endTo]) grouped[endTo] = [];

                    grouped[endTo].push({
                        ...trip,
                        status: label,
                    });
                });
            }
        });

        // 1. Get the keys (EndTo values) from the grouped object
        const sortedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b)); // Sort alphabetically.

        // 2. Create a new object to store the sorted grouped data
        const sortedGrouped: Record<string, GroupedTrip[]> = {};

        // 3. Iterate over the sorted keys and populate the new object
        sortedKeys.forEach((key) => {
            sortedGrouped[key] = grouped[key];
        });

        return sortedGrouped;
    }

    function getStatusOptions(type: "loaded" | "empty", currentStatus: TripStatus): TripStatus[] {
        const statusMap: Record<"loaded" | "empty", TripStatus[]> = {
            loaded: ["On Way", "Reported", "In Distillery", "Unloaded"],
            empty: ["On Way", "Standing", "Reported", "In Distillery", "Loaded"],
        };

        return statusMap[type].filter((status) => status !== currentStatus);
    }

    const updateTripStatus = async () => {
        if (!statusUpdate) return
        const obj = {
            dateTime: new Date(),
            user: {
                _id: user?._id,
                name: user?.name
            },
            status: statusUpdate.status,
            comment: statusUpdate.comment
        }
        try {
            const url = `${BASE_URL}/trans-app/trip-update/update-trip-status/${statusUpdate.tripId}`
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ statusUpdate: obj }),
            })
            if (!res.ok) throw new Error('Network Request Failed');
            else {
                toast.success("Trip status updated successfully", { richColors: true })
                setStatusUpdate(null)
                // Find and update the trip in the data variable with the new status update
                const allTrips = [
                    ...(data?.loaded?.onWay?.trips ?? []),
                    ...(data?.loaded?.reported?.trips ?? []),
                    ...(data?.empty?.onWay?.trips ?? []),
                    ...(data?.empty?.standing?.trips ?? []),
                    ...(data?.empty?.reported?.trips ?? [])
                ];

                const trip = allTrips.find(trip => trip._id === statusUpdate.tripId);
                if (trip) {
                    if (!trip.statusUpdate) trip.statusUpdate = [];
                    trip.statusUpdate.push({
                        dateTime: obj.dateTime.toString(),
                        user: {
                            _id: obj.user._id!,
                            name: obj.user.name!
                        },
                        status: obj.status,
                        comment: obj.comment
                    });
                }
                // Force state update to reflect the change in UI
                if (data && data.loaded && data.empty) {
                    setData({ loaded: data.loaded, empty: data.empty });
                }
            }
        } catch (error) {
            console.error(error)
            toast.error("Error", { description: String(error), richColors: true })
        }
    }

    return (
        <>
            {loading && <Loading />}
            {data &&
                <div className='my-8'>
                    <div className='w-full flex justify-end mb-3'>
                        <Button onClick={() => handleDownload()}>Download Report</Button>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                        <Card>
                            <CardHeader>
                                <CardTitle>Loaded Vehicles {data?.loaded?.onWay.count + data?.loaded?.reported.count}</CardTitle>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-2'>
                                <Button variant="outline" className='w-40' onClick={() => setFilter('loadedOnWay')}>
                                    <strong>On Way: </strong><span>{data?.loaded?.onWay.count}</span>
                                </Button>
                                <Button variant="outline" className='w-40' onClick={() => setFilter('loadedReported')}>
                                    <strong>Reported: </strong><span>{data?.loaded?.reported.count}</span>
                                </Button>
                            </CardContent>
                            <CardFooter></CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Empty Vehicles {data?.empty?.onWay.count + data?.empty?.reported.count + data?.empty?.standing.count}</CardTitle>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-2'>
                                <Button variant="outline" className='w-40' onClick={() => setFilter('emptyOnWay')}>
                                    <strong>On Way: </strong>{data?.empty?.onWay.count}
                                </Button>
                                <Button variant="outline" className='w-40' onClick={() => setFilter('emptyStanding')}>
                                    <strong>Standing: </strong>{data?.empty?.standing.count}
                                </Button>
                                <Button variant="outline" className='w-40' onClick={() => setFilter('emptyReported')}>
                                    <strong>Reported: </strong> {data?.empty?.reported.count}
                                </Button>
                            </CardContent>
                            <CardFooter></CardFooter>
                        </Card>
                        <Button variant="outline" className='w-max my-4' onClick={() => setFilter('all')}>View All Vehicles</Button>
                    </div>
                    {
                        filter !== 'all' &&
                        <Table className='w-full'>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SR No</TableHead>
                                    <TableHead>Vehicle No</TableHead>
                                    <TableHead>Last Updated Location</TableHead>
                                    <TableHead>Current Status</TableHead>
                                    {user?.Division.includes('Admin') && <TableHead>Superviser</TableHead>}
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filter == 'loadedOnWay' &&
                                    data.loaded.onWay.trips.map((trip, index) =>
                                        <TableRow key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distelary" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip?.TravelHistory?.[trip.TravelHistory?.length - 1]?.LocationOnTrackUpdate || trip.StartFrom}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell className='flex gap-2'>
                                                {user?.Division.includes('Admin') && <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>}
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                                {filter == 'loadedReported' &&
                                    data.loaded.reported.trips.map((trip, index) =>
                                        <TableRow key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distelary" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip?.TravelHistory?.[trip.TravelHistory?.length - 1]?.LocationOnTrackUpdate || trip.StartFrom}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell className='flex gap-2'>
                                                {user?.Division.includes('Admin') && <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>}
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                                {filter == 'emptyOnWay' &&
                                    data.empty.onWay.trips.map((trip, index) =>
                                        <TableRow key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distelary" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip?.TravelHistory?.[trip.TravelHistory?.length - 1]?.LocationOnTrackUpdate || trip.StartFrom}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell className='flex gap-2'>
                                                {user?.Division.includes('Admin') && <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>}
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                                {filter == 'emptyReported' &&
                                    data.empty.reported.trips.map((trip, index) =>
                                        <TableRow key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distelary" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip?.TravelHistory?.[trip.TravelHistory?.length - 1]?.LocationOnTrackUpdate || trip.StartFrom}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell className='flex gap-2'>
                                                {user?.Division.includes('Admin') && <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>}
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                                {filter == 'emptyStanding' &&
                                    data.empty.standing.trips.map((trip, index) =>
                                        <TableRow key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distelary" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip?.TravelHistory?.[trip.TravelHistory?.length - 1]?.LocationOnTrackUpdate || trip.StartFrom}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell className='flex gap-2'>
                                                {user?.Division.includes('Admin') && <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>}
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                            </TableBody>
                        </Table>
                    }
                    <div className='my-4'>
                        <Accordion type="single" collapsible defaultValue="loaded" className="mb-2 p-4 w-full">
                            {/* Loaded Vehicles */}
                            <AccordionItem value="loaded">
                                <AccordionTrigger className="text-lg font-semibold">Loaded Vehicles</AccordionTrigger>
                                <AccordionContent>
                                    {Object.entries(groupTripsByEndTo(data.loaded, "loaded")).map(([endTo, trips]) => (
                                        <Card key={endTo} className="mb-4">
                                            <CardHeader className="font-semibold text-md">{endTo}</CardHeader>
                                            <CardContent>
                                                <Table className="w-full">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Vehicle No</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Update</TableHead>
                                                            {user?.Division.includes('Admin') && <TableHead>Superviser</TableHead>}
                                                            <TableHead>Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {trips.map((trip) => (
                                                            <TableRow key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distelary" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                                                <TableCell>{trip.VehicleNo}</TableCell>
                                                                <TableCell>{trip.status}</TableCell>
                                                                <TableCell>{trip.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                                                <TableCell>{trip.superwiser}</TableCell>
                                                                <TableCell className='flex gap-2'>
                                                                    {user?.Division.includes('Admin') && <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="outline" size="sm">
                                                                                Update
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent>
                                                                            {tripStatusUpdateVars.map((statupOpetion) => (
                                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                                    {statupOpetion}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>}
                                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                                        <Eye />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>

                            {/* Empty Vehicles */}
                            <AccordionItem value="empty">
                                <AccordionTrigger className="text-lg font-semibold">Empty Vehicles</AccordionTrigger>
                                <AccordionContent>
                                    {Object.entries(groupTripsByEndTo(data.empty, "empty")).map(([endTo, trips]) => (
                                        <Card key={endTo} className="mb-4">
                                            <CardHeader className="font-semibold text-md">{endTo}</CardHeader>
                                            <CardContent>
                                                <Table className="w-full">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Vehicle No</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Update</TableHead>
                                                            {user?.Division.includes('Admin') && <TableHead>Superviser</TableHead>}
                                                            {user?.Division.includes('Admin') && <TableHead>Action</TableHead>}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {trips.map((trip) => (
                                                            <TableRow key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distelary" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                                                <TableCell>{trip.VehicleNo}</TableCell>
                                                                <TableCell>{trip.status === "Standing" ? "Not Programmed" : trip.status}</TableCell>
                                                                <TableCell>{trip.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                                                {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                                                <TableCell className='flex gap-2'>
                                                                    {user?.Division.includes('Admin') && <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="outline" size="sm">
                                                                                Update
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent>
                                                                            {tripStatusUpdateVars.map((statupOpetion) => (
                                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                                    {statupOpetion}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>}
                                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                                        <Eye />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div >
            }
            {<AlertDialog open={Boolean(statusUpdate)} onOpenChange={() => setStatusUpdate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        Update the trip status to {statusUpdate?.status}
                    </AlertDialogHeader>
                    <AlertDialogDescription className='text-foreground'>
                        <Label htmlFor='tripstatusUpdateComment'>Comment</Label>
                        <Input
                            id='tripstatusUpdateComment'
                            value={statusUpdate?.comment} onChange={(e) => setStatusUpdate(prev => prev ? { ...prev, comment: e.target.value } : null)}
                            placeholder='Add a comment (optional)'
                        />
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => updateTripStatus()}>Update</AlertDialogAction>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>}
            <Drawer open={viewingTrip !== null} onOpenChange={() => setViewingTrip(null)}>
                {viewingTrip &&
                    <DrawerContent className="mx-auto w-full max-w-lg px-4">
                        <DrawerHeader className="text-left">
                            <DrawerTitle>{findTripById(viewingTrip).VehicleNo + ": " + findTripById(viewingTrip).StartFrom + " - " + findTripById(viewingTrip).EndTo}</DrawerTitle>
                            <DrawerDescription>{viewingTrip}</DrawerDescription>
                        </DrawerHeader>
                        <div className='flex flex-col gap-1 mb-4'>
                            <div className='flex gap-2'>
                                <strong>Route: </strong> {findTripById(viewingTrip).StartFrom} to {findTripById(viewingTrip).EndTo}
                            </div>
                            <div className='flex gap-2'>
                                <strong>Started at: </strong> {formatDate(findTripById(viewingTrip).StartDate)}
                            </div>
                        </div>
                        {findTripById(viewingTrip)?.TravelHistory && <h4 className='font-semibold mt-4 mb-2'>Travel History</h4>}
                        {findTripById(viewingTrip)?.TravelHistory
                            ?.sort((a, b) => new Date(a.TrackUpdateDate).getTime() - new Date(b.TrackUpdateDate).getTime())
                            .map((history, index) => (
                                <Card key={index} className="mb-2">
                                    <CardHeader>
                                        <CardTitle className="text-md font-semibold">{formatDate(history.TrackUpdateDate)}</CardTitle>
                                        <CardDescription>
                                            {history.LocationOnTrackUpdate && <div><strong>Location on Track Update:</strong> {history.LocationOnTrackUpdate}</div>}
                                            {typeof history.OdometerOnTrackUpdate === "number" && <div><strong>Odometer:</strong> {history.OdometerOnTrackUpdate} km</div>}
                                            {history.ManagerComment && <div><strong>Manager Comment:</strong> {history.ManagerComment}</div>}
                                            {history.Driver && <div><strong>Driver:</strong> {history.Driver}</div>}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            ))
                        }
                        {findTripById(viewingTrip)?.statusUpdate && <h4 className='font-semibold mt-4 mb-2'>Status Updates</h4>}
                        {findTripById(viewingTrip)?.statusUpdate
                            ?.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                            .map((history, index) => (
                                <Card key={index} className="mb-2">
                                    <CardHeader>
                                        <CardTitle className="text-md font-semibold">{formatDate(history.dateTime)}</CardTitle>
                                        <CardDescription className='text-foreground'>
                                            {history.status && <div><strong>Status:</strong> {history.status}</div>}
                                            {history.comment && <div><strong>Comment:</strong> {history.comment}</div>}
                                        </CardDescription>
                                        <CardFooter>{history.user.name}</CardFooter>
                                    </CardHeader>
                                </Card>
                            ))
                        }
                        <DrawerFooter className="pt-2">
                            <DrawerClose asChild>
                                <Button variant="outline">Close</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                }
            </Drawer>
        </>
    )
}

export default VehiclesSummary
