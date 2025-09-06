import Loading from '@/app/loading';
import { BASE_URL } from '@/lib/api'
import { TankersTrip, TransAppUser, TripsSummary, TripStatusUpdateEnums, tripStatusUpdateVars } from '@/types'
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { camelToWords, formatDate } from '@/lib/utils';
import { generateTripsReport } from "@/utils/excel";
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Eye, Pen, X } from 'lucide-react';
import Link from 'next/link';

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
        UnloadDate: string | Date | null;
        ReportDate: string | Date | null;
    };
    TravelHistory: {
        TrackUpdateDate: Date;
        LocationOnTrackUpdate: string;
        OdometerOnTrackUpdate: number;
        ManagerComment: string;
        Driver: string;
    }[];
    TallyLoadDetail: {
        LockNo: string;
        BillingPartyName: string;
        BillingRoute: string;
        BooksOf: string;
        Consignee: string;
        Consignor: string;
        DieselRoute: string;
        DriverLicenseNo: string;
        DriverLicenseValidityDate: string;
        DriverName: string;
        EndOdometer: number;
        FinancialyClose: number;
        FinancialyCloseDate: string;
        Goods: string;
        GRNo: string;
        GUID: string;
        KMbyDieseRoute: number;
        KMbyRoute: number;
        LoadingDate: string;
        LoadingQty: number;
        MasterId: number;
        OperationalyClose: number;
        PartyLedger: string;
        PersistedView: string;
        ReportedDate: string;
        ShortageQty: number;
        StartOdometer: number;
        SyncDateTime: string;
        TripId: string;
        UnloadingDate: string;
        UnloadingQty: number;
        UnloadingTime: number;
        VehicleMode: string;
        VehicleNo: string;
        VoucherDate: string;
        VoucherKey: number;
        VoucherNo: string;
        VoucherType: string;
    };
    VehicleNo: string;
    capacity: string;
    StartFrom?: string;
    EndTo: string;
    superwiser?: string;
    loadingSupervisor?: string;
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
    EmptyTripDetail: {
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
    const [filter, setFilter] = useState<'all' | 'loadedOnWay' | 'loadedReported' | 'emptyOnWay' | 'emptyReported' | 'emptyStanding' | 'outsideStandingVehicles' | 'notLoadedVehicles' | 'loaded'>('all')
    const [viewingTrip, setViewingTrip] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [allVehiclesAccordion, setAllVehiclesAccordion] = useState<string>('')

    // Helper function to highlight matching text
    const highlightText = (text: string) => {
        if (!searchTerm) return text;
        const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === searchTerm.toLowerCase()
                ? <span key={i} className="bg-yellow-600 text-foreground">{part}</span>
                : part
        );
    };

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
                    // Filter based on search term
                    if (searchTerm && !endTo.toLowerCase().includes(searchTerm.toLowerCase())) {
                        return;
                    }
                    if (!grouped[endTo]) grouped[endTo] = [];

                    grouped[endTo].push({
                        ...trip,
                        status: label,
                    });
                });
            }
        });

        // 1. Get the keys (EndTo values) from the grouped object
        const keys = Object.keys(grouped).sort((a, b) => a.localeCompare(b)); // alphabetical groups

        // Use the exported tripStatusUpdateVars to define ordering of statusUpdate statuses
        const statusOrder = [...tripStatusUpdateVars] as TripStatusUpdateEnums[];

        // Sort trips inside each group by their latest statusUpdate.status according to statusOrder
        keys.forEach((key) => {
            grouped[key].sort((t1, t2) => {
                const latest1 = t1.statusUpdate?.[t1.statusUpdate.length - 1]?.status;
                const latest2 = t2.statusUpdate?.[t2.statusUpdate.length - 1]?.status;

                const i1 = latest1 ? statusOrder.indexOf(latest1) : -1;
                const i2 = latest2 ? statusOrder.indexOf(latest2) : -1;

                // Unknown statuses (not found in statusOrder) go to the end
                if (i1 !== i2) {
                    if (i1 === -1) return 1;
                    if (i2 === -1) return -1;
                    return i1 - i2;
                }

                // Tie-breaker: deterministic order by VehicleNo
                return (t1.VehicleNo ?? "").localeCompare(t2.VehicleNo ?? "");
            });
        });

        const sortedKeys = keys;

        // 2. Create a new object to store the sorted grouped data
        const sortedGrouped: Record<string, GroupedTrip[]> = {};

        // 3. Iterate over the sorted keys and populate the new object
        sortedKeys.forEach((key) => {
            sortedGrouped[key] = grouped[key];
        });

        return sortedGrouped;
    }

    function groupBySupervisors(data: TripData | undefined, type: "loaded" | "empty") {
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
                    const supervisor = trip.superwiser || "Unknown";
                    // Filter based on search term
                    if (searchTerm && !supervisor.toLowerCase().includes(searchTerm.toLowerCase())) {
                        return;
                    }
                    if (!grouped[supervisor]) grouped[supervisor] = [];

                    grouped[supervisor].push({
                        ...trip,
                        status: label,
                    });
                });
            }
        });

        // 1. Get the keys (EndTo values) from the grouped object
        const keys = Object.keys(grouped).sort((a, b) => a.localeCompare(b)); // alphabetical groups

        // Use the exported tripStatusUpdateVars to define ordering of statusUpdate statuses
        const statusOrder = [...tripStatusUpdateVars] as TripStatusUpdateEnums[];

        // Sort trips inside each group by their latest statusUpdate.status according to statusOrder
        keys.forEach((key) => {
            grouped[key].sort((t1, t2) => {
                const latest1 = t1.statusUpdate?.[t1.statusUpdate.length - 1]?.status;
                const latest2 = t2.statusUpdate?.[t2.statusUpdate.length - 1]?.status;

                const i1 = latest1 ? statusOrder.indexOf(latest1) : -1;
                const i2 = latest2 ? statusOrder.indexOf(latest2) : -1;

                // Unknown statuses (not found in statusOrder) go to the end
                if (i1 !== i2) {
                    if (i1 === -1) return 1;
                    if (i2 === -1) return -1;
                    return i1 - i2;
                }

                // Tie-breaker: deterministic order by VehicleNo
                return (t1.VehicleNo ?? "").localeCompare(t2.VehicleNo ?? "");
            });
        });

        const sortedKeys = keys;

        // 2. Create a new object to store the sorted grouped data
        const sortedGrouped: Record<string, GroupedTrip[]> = {};

        // 3. Iterate over the sorted keys and populate the new object
        sortedKeys.forEach((key) => {
            sortedGrouped[key] = grouped[key];
        });

        return sortedGrouped;
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
            setLoading(true)
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
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {loading && <Loading />}
            {data &&
                <div className='mb-4'>
                    <div className='w-full flex justify-end mb-3 -mt-14 sm:mt-0'>
                        <Button onClick={() => handleDownload()}>Download Report</Button>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                        <Card>
                            <CardHeader>
                                <CardTitle>Loaded Vehicles {data?.loaded?.onWay.count + data?.loaded?.reported.count}</CardTitle>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-2'>
                                <Button
                                    variant="outline"
                                    className={`w-40 ${filter !== 'all' && filter === 'loadedOnWay' ? 'bg-card text-card-foreground border-white' : ''}`}
                                    onClick={() => setFilter('loadedOnWay')}
                                >
                                    <strong>On Way: </strong><span>{data?.loaded?.onWay.count}</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className={`w-40 ${filter !== 'all' && filter === 'loadedReported' ? 'bg-card text-card-foreground border-white' : ''}`}
                                    onClick={() => setFilter('loadedReported')}
                                >
                                    <strong>Reported: </strong><span>{data?.loaded?.reported.count}</span>
                                </Button>
                            </CardContent>
                            {/* <CardFooter></CardFooter> */}
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Empty Vehicles {data?.empty?.onWay.count + data?.empty?.reported.count + data?.empty?.standing.count}</CardTitle>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-2'>
                                <Button
                                    variant="outline"
                                    className={`w-40 ${filter !== 'all' && filter === 'emptyOnWay' ? 'bg-card text-card-foreground border-white' : ''}`}
                                    onClick={() => setFilter('emptyOnWay')}
                                >
                                    <strong>On Way: </strong>{data?.empty?.onWay.count}
                                </Button>
                                <Button
                                    variant="outline"
                                    className={`w-40 ${filter !== 'all' && filter === 'emptyStanding' ? 'bg-card text-card-foreground border-white' : ''}`}
                                    onClick={() => setFilter('emptyStanding')}
                                >
                                    <strong>Standing: </strong>{data?.empty?.standing.count}
                                </Button>
                                <div className='flex gap-2 flex-wrap'>
                                    {/* <Button
                                        variant="outline"
                                        className={`w-40 ${filter !== 'all' && filter === 'emptyReported' ? 'bg-card text-card-foreground border-white' : ''}`}
                                        onClick={() => setFilter('emptyReported')}
                                    >
                                        <strong>Reported: </strong> {data?.empty?.reported.count}
                                    </Button> */}
                                    <Button
                                        variant="outline"
                                        className={`w-40 ${filter !== 'all' && filter === 'outsideStandingVehicles' ? 'bg-card text-card-foreground border-white' : ''}`}
                                        onClick={() => setFilter("outsideStandingVehicles")}
                                    >
                                        {/* <strong>Outside Standing: </strong> {data.empty.reported.trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status !== "In Distillery").length - data.empty.reported.trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Loaded").length} */}
                                        <strong>Outside Standing: </strong> {data.empty.reported.trips.filter((trip) => (trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status !== "In Distillery" && trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status !== "Loaded")).length}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className={`w-40 ${filter !== 'all' && filter === 'notLoadedVehicles' ? 'bg-card text-card-foreground border-white' : ''}`}
                                        onClick={() => setFilter("notLoadedVehicles")}
                                    >
                                        <strong>Not Loaded: </strong> {data.empty.reported.trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Distillery").length}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className={`w-40 ${filter !== 'all' && filter === 'loaded' ? 'bg-card text-card-foreground border-white' : ''}`}
                                        onClick={() => setFilter("loaded")}
                                    >
                                        <strong>Loaded: </strong> {data.empty.reported.trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Loaded").length}
                                    </Button>
                                </div>
                            </CardContent>
                            {/* <CardFooter></CardFooter> */}
                        </Card>
                        {filter !== 'all' &&
                            <div className='flex items-center gap-2'>
                                <span>{camelToWords(filter)}</span>
                                <Button variant="outline" className='w-max my-4' onClick={() => setFilter('all')}>View All Vehicles Summary</Button>
                            </div>
                        }
                    </div>
                    <div className='flex justify-center gap-2 my-4'>
                        <div className="relative w-[310px]">
                            <Input
                                id="searchInput"
                                type="text"
                                placeholder="Search by destination or Supervisor name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pr-8"
                            />
                            {searchTerm && (
                                <Button
                                    size="icon"
                                    aria-label="Clear search"
                                    onClick={() => { setSearchTerm(''); (document.getElementById('searchInput') as HTMLInputElement | null)?.focus(); }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-sm"
                                >
                                    <X />
                                </Button>
                            )}
                        </div>
                    </div>
                    {
                        filter !== 'all' &&
                        <Table className='w-full min-w-max'>
                            <TableHeader>
                                {(filter !== "outsideStandingVehicles" && filter !== "notLoadedVehicles" && filter !== "loaded") &&
                                    <TableRow>
                                        <TableHead>SR No</TableHead>
                                        <TableHead>{(filter === 'loadedOnWay' || filter === 'emptyOnWay') ? "Destination" : "End Location"}</TableHead>
                                        <TableHead>Vehicle No</TableHead>
                                        <TableHead>Type/Capacity</TableHead>
                                        <TableHead>Last Updated Location</TableHead>
                                        {filter === 'emptyReported' && <TableHead>Loading Supervisor</TableHead>}
                                        {(filter === 'emptyReported' || filter === 'loadedReported') && <TableHead>Reached On</TableHead>}
                                        <TableHead>Current Status</TableHead>
                                        {user?.Division.includes('Admin') && <TableHead>Superviser</TableHead>}
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                }{
                                    (filter == "outsideStandingVehicles" || filter == "notLoadedVehicles") &&
                                    <TableRow>
                                        <TableHead>SR No</TableHead>
                                        <TableHead>Vehicle No</TableHead>
                                        <TableHead>Type/Capacity</TableHead>
                                        {user?.Division.includes('Admin') && <TableHead>Vehicle Manager</TableHead>}
                                        <TableHead>Loading Station</TableHead>
                                        <TableHead>Loading Supervisor</TableHead>
                                        <TableHead>Reached On</TableHead>
                                        <TableHead>{filter == "outsideStandingVehicles" ? "Current Status" : "Reason"}</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                }{
                                    (filter == "loaded") &&
                                    <TableRow>
                                        <TableHead>SR No</TableHead>
                                        <TableHead>Vehicle No</TableHead>
                                        <TableHead>Type/Capacity</TableHead>
                                        {user?.Division.includes('Admin') && <TableHead>Vehicle Manager</TableHead>}
                                        <TableHead>Loading Station</TableHead>
                                        <TableHead>Loading Supervisor</TableHead>
                                        <TableHead>Reached On</TableHead>
                                        <TableHead>Status Update Time</TableHead>
                                        {/* <TableHead>Action</TableHead> */}
                                    </TableRow>
                                }
                            </TableHeader>
                            <TableBody>
                                {filter == 'loadedOnWay' &&
                                    data.loaded.onWay.trips.sort((a, b) => a.EndTo.localeCompare(b.EndTo)).map((trip, index) =>
                                        <TableRow onClick={(e: React.MouseEvent) => {
                                            const el = e.target as HTMLElement | null;
                                            // if the click happened inside the dropdown, don't open the drawer
                                            if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                setViewingTrip(trip._id)
                                            }
                                        }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.EndTo}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip.capacity}</TableCell>
                                            <TableCell>{trip?.TravelHistory?.[trip.TravelHistory?.length - 1]?.LocationOnTrackUpdate}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell className='flex gap-2'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className='dropdown'>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuItem>
                                                            <Link href={{
                                                                pathname: "trans-app/unloading-tracker",
                                                                query: {
                                                                    actionType: "report",
                                                                    tripId: trip._id
                                                                }
                                                            }}>Reported</Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                                {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                    <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                        <Pen />
                                                    </Link>
                                                </Button>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                                {filter == 'loadedReported' &&
                                    data.loaded.reported.trips.sort((a, b) => a.EndTo.localeCompare(b.EndTo)).map((trip, index) =>
                                        <TableRow onClick={(e: React.MouseEvent) => {
                                            const el = e.target as HTMLElement | null;
                                            // if the click happened inside the dropdown, don't open the drawer
                                            if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                setViewingTrip(trip._id)
                                            }
                                        }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.EndTo}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip.capacity}</TableCell>
                                            <TableCell>{trip?.TravelHistory?.[trip.TravelHistory?.length - 1]?.LocationOnTrackUpdate}</TableCell>
                                            <TableHead>{formatDate(trip.LoadTripDetail.ReportDate || trip.TallyLoadDetail.ReportedDate)}</TableHead>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell className='flex gap-2'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className='dropdown'>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                                {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                    <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                        <Pen />
                                                    </Link>
                                                </Button>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                                {filter == 'emptyOnWay' &&
                                    data.empty.onWay.trips.sort((a, b) => a.EndTo.localeCompare(b.EndTo)).map((trip, index) =>
                                        <TableRow onClick={(e: React.MouseEvent) => {
                                            const el = e.target as HTMLElement | null;
                                            // if the click happened inside the dropdown, don't open the drawer
                                            if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                setViewingTrip(trip._id)
                                            }
                                        }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.EndTo}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip.capacity}</TableCell>
                                            <TableCell>{trip?.TravelHistory?.[trip.TravelHistory?.length - 1]?.LocationOnTrackUpdate}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell className='flex gap-2'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className='dropdown'>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuItem>
                                                            <Link href={{
                                                                pathname: "trans-app/loading-tracker",
                                                                query: {
                                                                    actionType: "destinationChange",
                                                                    tripId: trip._id
                                                                }
                                                            }}>Change Destination</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Link href={{
                                                                pathname: "trans-app/loading-tracker",
                                                                query: {
                                                                    actionType: "report",
                                                                    tripId: trip._id
                                                                }
                                                            }}>Reported</Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                                {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                    <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                        <Pen />
                                                    </Link>
                                                </Button>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                                {filter == 'outsideStandingVehicles' &&
                                    data.empty.reported.trips.filter((trip) => (trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status !== "In Distillery" && trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status !== "Loaded")).sort((a, b) => a.EndTo.localeCompare(b.EndTo)).map((trip, index) =>
                                        <TableRow onClick={(e: React.MouseEvent) => {
                                            const el = e.target as HTMLElement | null;
                                            // if the click happened inside the dropdown, don't open the drawer
                                            if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                setViewingTrip(trip._id)
                                            }
                                        }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip.capacity}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell>{trip.EndTo}</TableCell>
                                            <TableCell>{trip.loadingSupervisor}</TableCell>
                                            <TableCell>{formatDate(trip.EmptyTripDetail.ReportDate)}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status !== "Custom" ? trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment}</TableCell>
                                            <TableCell className='flex gap-2'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className='dropdown'>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                                {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                    <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                        <Pen />
                                                    </Link>
                                                </Button>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                                {filter == 'notLoadedVehicles' &&
                                    data.empty.reported.trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Distillery").sort((a, b) => a.EndTo.localeCompare(b.EndTo)).map((trip, index) =>
                                        <TableRow onClick={(e: React.MouseEvent) => {
                                            const el = e.target as HTMLElement | null;
                                            // if the click happened inside the dropdown, don't open the drawer
                                            if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                setViewingTrip(trip._id)
                                            }
                                        }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip.capacity}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell>{trip.EndTo}</TableCell>
                                            <TableCell>{trip.loadingSupervisor}</TableCell>
                                            <TableCell>{formatDate(trip.EmptyTripDetail.ReportDate)}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status !== "Custom" ? trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment}</TableCell>
                                            <TableCell className='flex gap-2'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className='dropdown'>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                                {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                    <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                        <Pen />
                                                    </Link>
                                                </Button>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                                {filter == 'loaded' &&
                                    data.empty.reported.trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Loaded").sort((a, b) => a.EndTo.localeCompare(b.EndTo)).map((trip, index) =>
                                        <TableRow onClick={(e: React.MouseEvent) => {
                                            const el = e.target as HTMLElement | null;
                                            // if the click happened inside the dropdown, don't open the drawer
                                            if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                setViewingTrip(trip._id)
                                            }
                                        }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip.capacity}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell>{trip.EndTo}</TableCell>
                                            <TableCell>{trip.loadingSupervisor}</TableCell>
                                            <TableCell>{formatDate(trip.EmptyTripDetail.ReportDate)}</TableCell>
                                            <TableCell>{formatDate(trip.statusUpdate?.[trip.statusUpdate?.length - 1]?.dateTime)}</TableCell>
                                            {/* <TableCell className='flex gap-2'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className='dropdown'>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                                {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                    <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                        <Pen />
                                                    </Link>
                                                </Button>}
                                            </TableCell> */}
                                        </TableRow>
                                    )
                                }
                                {filter == 'emptyReported' &&
                                    data.empty.reported.trips.sort((a, b) => a.EndTo.localeCompare(b.EndTo)).map((trip, index) =>
                                        <TableRow onClick={(e: React.MouseEvent) => {
                                            const el = e.target as HTMLElement | null;
                                            // if the click happened inside the dropdown, don't open the drawer
                                            if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                setViewingTrip(trip._id)
                                            }
                                        }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.EndTo}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip.capacity}</TableCell>
                                            <TableCell>{trip?.TravelHistory?.[trip.TravelHistory?.length - 1]?.LocationOnTrackUpdate}</TableCell>
                                            <TableCell>{trip.loadingSupervisor}</TableCell>
                                            <TableCell>{formatDate(trip.EmptyTripDetail.ReportDate)}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell className='flex gap-2'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className='dropdown'>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuItem>
                                                            <Link href={{
                                                                pathname: "trans-app/loading-tracker",
                                                                query: {
                                                                    actionType: "destinationChange",
                                                                    tripId: trip._id
                                                                }
                                                            }}>Change Destination</Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                                {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                    <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                        <Pen />
                                                    </Link>
                                                </Button>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                                {filter == 'emptyStanding' &&
                                    data.empty.standing.trips.sort((a, b) => a.EndTo.localeCompare(b.EndTo)).map((trip, index) =>
                                        <TableRow onClick={(e: React.MouseEvent) => {
                                            const el = e.target as HTMLElement | null;
                                            // if the click happened inside the dropdown, don't open the drawer
                                            if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                setViewingTrip(trip._id)
                                            }
                                        }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{trip.EndTo}</TableCell>
                                            <TableCell>{trip.VehicleNo}</TableCell>
                                            <TableCell>{trip.capacity}</TableCell>
                                            <TableCell>{trip?.TravelHistory?.[trip.TravelHistory?.length - 1]?.LocationOnTrackUpdate}</TableCell>
                                            <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                            {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                            <TableCell className='flex gap-2'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Update
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className='dropdown'>
                                                        {tripStatusUpdateVars.map((statupOpetion) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuItem>
                                                            <Link href={{
                                                                pathname: "trans-app/loading-planner",
                                                                query: {
                                                                    tripId: trip._id
                                                                }
                                                            }}>Give Plane</Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                    <Eye />
                                                </Button>
                                                {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                    <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                        <Pen />
                                                    </Link>
                                                </Button>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                            </TableBody>
                        </Table>
                    }

                    {/* summary table for admins */}
                    {user?.Division.includes('Admin') &&
                        <Accordion type='single' collapsible >
                            <AccordionItem value='locationwise'>
                                <AccordionTrigger>
                                    <div className='text-center mt-4 font-semibold text-xl'>Location Wise Summary</div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div>
                                        Programmed Vehicles
                                    </div>
                                    <Table className='w-full'>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Sr No.</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead>On Way</TableHead>
                                                <TableHead>Reported</TableHead>
                                                <TableHead>In Distillery</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(groupTripsByEndTo(data.empty, "empty"))
                                                .filter(([endTo]) => !searchTerm || endTo.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map(([endTo, trips], index) => (
                                                    <TableRow key={endTo} id={endTo} onClick={() => { setAllVehiclesAccordion("empty"); setSearchTerm(endTo) }}>
                                                        <TableHead>{index + 1}</TableHead>
                                                        <TableHead>{highlightText(endTo)}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip.status === "On Way")?.length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip.status === "Reported")?.length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Distillery").length}</TableHead>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                    <div className='text-center font-semibold text-lg mt-4'>
                                        Loaded Vehicles
                                    </div>
                                    <Table className='w-full'>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Sr No.</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead>On Way</TableHead>
                                                <TableHead>Reported</TableHead>
                                                <TableHead>In Distillery</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(groupTripsByEndTo(data.loaded, "loaded"))
                                                .filter(([endTo]) => !searchTerm || endTo.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map(([endTo, trips], index) => (
                                                    <TableRow key={endTo} id={endTo} onClick={() => { setAllVehiclesAccordion("loaded"); setSearchTerm(endTo) }}>
                                                        <TableHead>{index + 1}</TableHead>
                                                        <TableHead>{highlightText(endTo)}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip.status === "On Way")?.length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip.status === "Reported")?.length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Distillery").length}</TableHead>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                    {/* <div className='mt-4'>
                                Standing Vehicles
                            </div>
                            <Table className='w-full'>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sr No.</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>On Way</TableHead>
                                        <TableHead>Reported</TableHead>
                                        <TableHead>In Distillery</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(groupTripsByEndTo(data.empty, "loaded")).map(([endTo, trips], index) => (
                                        <TableRow key={endTo} id={endTo}>
                                            <TableHead>{index + 1}</TableHead>
                                            <TableHead>{endTo}</TableHead>
                                            <TableHead>{trips.filter((trip) => trip.status === "On Way")?.length}</TableHead>
                                            <TableHead>{trips.filter((trip) => trip.status === "Reported")?.length}</TableHead>
                                            <TableHead>{trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Distillery").length}</TableHead>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table> */}
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="superwiserwise">
                                <AccordionTrigger>
                                    <div className='text-center mt-4 font-semibold text-xl'>Supervisor Wise Summary</div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table className='w-full'>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Sr No.</TableHead>
                                                <TableHead>Supervisor</TableHead>
                                                <TableHead>On Way</TableHead>
                                                <TableHead>Reported</TableHead>
                                                <TableHead>In Distillery</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className='text-center font-semibold text-lg' colSpan={5}>Empty Vehicles</TableCell>
                                            </TableRow>
                                            {Object.entries(groupBySupervisors(data.empty, "empty"))
                                                .filter(([endTo]) => !searchTerm || endTo.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map(([endTo, trips], index) => (
                                                    <TableRow key={endTo} id={endTo} onClick={() => { setAllVehiclesAccordion("supervisors"); setSearchTerm(endTo) }}>
                                                        <TableHead>{index + 1}</TableHead>
                                                        <TableHead>{highlightText(endTo)}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip.status === "On Way")?.length - (trips.filter((trip) => trip.status === "Reported")?.length + trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Distillery").length)}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip.status === "Reported")?.length - trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Distillery").length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Distillery").length}</TableHead>
                                                    </TableRow>
                                                ))
                                            }
                                            <TableRow>
                                                <TableCell className='text-center font-semibold text-lg' colSpan={5}>Loaded Vehicles</TableCell>
                                            </TableRow>
                                            {Object.entries(groupBySupervisors(data.loaded, "loaded"))
                                                .filter(([endTo]) => !searchTerm || endTo.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map(([endTo, trips], index) => (
                                                    <TableRow key={endTo} id={endTo} onClick={() => { setAllVehiclesAccordion("supervisors"); setSearchTerm(endTo) }}>
                                                        <TableHead>{index + 1}</TableHead>
                                                        <TableHead>{highlightText(endTo)}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip.status === "On Way")?.length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip.status === "Reported")?.length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Distillery").length}</TableHead>
                                                    </TableRow>
                                                ))
                                            }
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    }

                    <div className='my-4'>
                        {filter === "all" && <Accordion value={allVehiclesAccordion} onValueChange={setAllVehiclesAccordion} type="single" collapsible className="mb-2 p-4 w-full">
                            {/* Loaded Vehicles */}
                            <AccordionItem value="loaded">
                                <AccordionTrigger className="text-lg font-semibold">Loaded Vehicles</AccordionTrigger>
                                <AccordionContent>
                                    {Object.entries(groupTripsByEndTo(data.loaded, "loaded")).map(([endTo, trips]: [string, GroupedTrip[]]) => (
                                        <Card key={endTo} className="mb-4">
                                            <CardHeader className="font-semibold text-md flex flex-row">{highlightText(endTo)}</CardHeader>
                                            <CardContent>
                                                <Table className="w-max min-w-full">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Vehicle No</TableHead>
                                                            <TableHead>Type/Capacity</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Update</TableHead>
                                                            {user?.Division.includes('Admin') && <TableHead>Superviser</TableHead>}
                                                            <TableHead>Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {trips.sort((a: GroupedTrip, b: GroupedTrip) => a.status.localeCompare(b.status)).map((trip: GroupedTrip) => (
                                                            <TableRow onClick={(e: React.MouseEvent) => {
                                                                const el = e.target as HTMLElement | null;
                                                                // if the click happened inside the dropdown, don't open the drawer
                                                                if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                                    setViewingTrip(trip._id)
                                                                }
                                                            }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                                                <TableCell>{trip.VehicleNo}</TableCell>
                                                                <TableCell>{trip.capacity}</TableCell>
                                                                <TableCell>{trip.status}</TableCell>
                                                                <TableCell>{trip.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === 'Custom' ? trip.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment : trip.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                                                {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                                                <TableCell className='flex gap-2'>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="outline" size="sm">
                                                                                Update
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent className='dropdown'>
                                                                            {tripStatusUpdateVars.map((statupOpetion) => (
                                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                                    {statupOpetion}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                            {trip.status == "On Way" && <DropdownMenuItem>
                                                                                <Link href={{
                                                                                    pathname: "trans-app/unloading-tracker",
                                                                                    query: {
                                                                                        actionType: "report",
                                                                                        tripId: trip._id
                                                                                    }
                                                                                }}>Reported</Link>
                                                                            </DropdownMenuItem>}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                                        <Eye />
                                                                    </Button>
                                                                    {!user?.Division.includes('Admin') && <Button className='link' variant="outline" size="sm">
                                                                        <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                                            <Pen />
                                                                        </Link>
                                                                    </Button>}
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
                                    {Object.entries(groupTripsByEndTo(data.empty, "empty")).map(([endTo, trips]: [string, GroupedTrip[]]) => (
                                        <Card key={endTo} className="mb-4">
                                            <CardHeader className="font-semibold text-md flex flex-row">{highlightText(endTo)}</CardHeader>
                                            <CardContent>
                                                <Table className="w-max min-w-full">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Vehicle No</TableHead>
                                                            <TableHead>Type/Capacity</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            {trips.some(trip => Boolean(trip.loadingSupervisor)) && <TableHead>Loading Supervisor</TableHead>}
                                                            <TableHead>Update</TableHead>
                                                            {user?.Division.includes('Admin') && <TableHead>Superviser</TableHead>}
                                                            {user?.Division.includes('Admin') && <TableHead>Action</TableHead>}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {trips.sort((a: GroupedTrip, b: GroupedTrip) => a.status.localeCompare(b.status)).map((trip: GroupedTrip) => (
                                                            <TableRow onClick={(e: React.MouseEvent) => {
                                                                const el = e.target as HTMLElement | null;
                                                                // if the click happened inside the dropdown, don't open the drawer
                                                                if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                                    setViewingTrip(trip._id)
                                                                }
                                                            }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                                                <TableCell>{trip.VehicleNo}</TableCell>
                                                                <TableCell>{trip.capacity}</TableCell>
                                                                <TableCell>{trip.status === "Standing" ? "Not Programmed" : trip.status}</TableCell>
                                                                {trips.some(trip => Boolean(trip.loadingSupervisor)) && <TableCell>{trip.loadingSupervisor}</TableCell>}
                                                                <TableCell>{trip.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Custom" ? trip.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment : trip.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                                                {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                                                <TableCell className='flex gap-2'>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="outline" size="sm">
                                                                                Update
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent className='dropdown'>
                                                                            {tripStatusUpdateVars.map((statupOpetion) => (
                                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                                    {statupOpetion}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                            {(trip.status == "Reported" || trip.status == "On Way") &&
                                                                                <DropdownMenuItem>
                                                                                    <Link href={{
                                                                                        pathname: "trans-app/loading-tracker",
                                                                                        query: {
                                                                                            actionType: "destinationChange",
                                                                                            tripId: trip._id
                                                                                        }
                                                                                    }}>Change Destination</Link>
                                                                                </DropdownMenuItem>
                                                                            }
                                                                            {trip.status == "On Way" && <DropdownMenuItem>
                                                                                <Link href={{
                                                                                    pathname: "trans-app/loading-tracker",
                                                                                    query: {
                                                                                        actionType: "report",
                                                                                        tripId: trip._id
                                                                                    }
                                                                                }}>Reported</Link>
                                                                            </DropdownMenuItem>}
                                                                            {trip.status == "Standing" &&
                                                                                <DropdownMenuItem>
                                                                                    <Link href={{
                                                                                        pathname: "trans-app/loading-planner",
                                                                                        query: {
                                                                                            tripId: trip._id
                                                                                        }
                                                                                    }}>Give Plane</Link>
                                                                                </DropdownMenuItem>}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                                        <Eye />
                                                                    </Button>
                                                                    {!user?.Division.includes('Admin') && <Button variant="outline" size="sm">
                                                                        <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                                            <Pen />
                                                                        </Link>
                                                                    </Button>}
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

                            {/* Super visor wise Vehicles */}
                            {user?.Division.includes('Admin') &&
                                <AccordionItem value="supervisors">
                                    <AccordionTrigger className="text-lg font-semibold">Supervisor Wise Data</AccordionTrigger>
                                    <AccordionContent>
                                        <div className='text-center font-semibold text-lg'>Empty Vehicles</div>
                                        {Object.entries(groupBySupervisors(data.empty, "empty")).map(([endTo, trips]: [string, GroupedTrip[]]) => (
                                            <Card key={endTo} className="mb-4">
                                                <CardHeader className="font-semibold text-md flex flex-row">{highlightText(endTo)}</CardHeader>
                                                <CardContent>
                                                    <Table className="w-max min-w-full">
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Sr No</TableHead>
                                                                <TableHead>Vehicle No</TableHead>
                                                                <TableHead>Capacity</TableHead>
                                                                {user?.Division.includes('Admin') && <TableHead>Superviser</TableHead>}
                                                                <TableHead>Loading Station</TableHead>
                                                                <TableHead>Loading Supervisor</TableHead>
                                                                <TableHead>Reached On</TableHead>
                                                                <TableHead>Status</TableHead>
                                                                <TableHead>Update</TableHead>
                                                                {user?.Division.includes('Admin') && <TableHead>Action</TableHead>}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {trips.sort((a: GroupedTrip, b: GroupedTrip) => a.status.localeCompare(b.status)).map((trip: GroupedTrip, index) => (
                                                                <TableRow onClick={(e: React.MouseEvent) => {
                                                                    const el = e.target as HTMLElement | null;
                                                                    // if the click happened inside the dropdown, don't open the drawer
                                                                    if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                                        setViewingTrip(trip._id)
                                                                    }
                                                                }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                                                    <TableCell>{index + 1}</TableCell>
                                                                    <TableCell>{trip.VehicleNo}</TableCell>
                                                                    <TableCell>{trip.capacity}</TableCell>
                                                                    {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                                                    <TableCell>{trip.EndTo}</TableCell>
                                                                    <TableCell>{trip.loadingSupervisor}</TableCell>
                                                                    <TableCell>{formatDate(trip.LoadTripDetail?.ReportDate || trip.LoadTripDetail?.UnloadDate || trip.TallyLoadDetail?.ReportedDate || trip.TallyLoadDetail?.UnloadingDate)}</TableCell>
                                                                    <TableCell>{trip.status === "Standing" ? "Not Programmed" : trip.status}</TableCell>
                                                                    <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                                                    <TableCell className='flex gap-2'>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="outline" size="sm">
                                                                                    Update
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent className='dropdown'>
                                                                                {tripStatusUpdateVars.map((statupOpetion) => (
                                                                                    <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                                        {statupOpetion}
                                                                                    </DropdownMenuItem>
                                                                                ))}
                                                                                {(trip.status == "Reported" || trip.status == "On Way") &&
                                                                                    <DropdownMenuItem>
                                                                                        <Link href={{
                                                                                            pathname: "trans-app/loading-tracker",
                                                                                            query: {
                                                                                                actionType: "destinationChange",
                                                                                                tripId: trip._id
                                                                                            }
                                                                                        }}>Change Destination</Link>
                                                                                    </DropdownMenuItem>
                                                                                }
                                                                                {trip.status == "On Way" && <DropdownMenuItem>
                                                                                    <Link href={{
                                                                                        pathname: "trans-app/loading-tracker",
                                                                                        query: {
                                                                                            actionType: "report",
                                                                                            tripId: trip._id
                                                                                        }
                                                                                    }}>Reported</Link>
                                                                                </DropdownMenuItem>}
                                                                                {trip.status == "Standing" &&
                                                                                    <DropdownMenuItem>
                                                                                        <Link href={{
                                                                                            pathname: "trans-app/loading-planner",
                                                                                            query: {
                                                                                                tripId: trip._id
                                                                                            }
                                                                                        }}>Give Plane</Link>
                                                                                    </DropdownMenuItem>}
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                        <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                                            <Eye />
                                                                        </Button>
                                                                        {!user?.Division.includes('Admin') && <Button variant="outline" size="sm">
                                                                            <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                                                <Pen />
                                                                            </Link>
                                                                        </Button>}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        <div className='text-center font-semibold text-lg'>Loaded Vehicles</div>
                                        {Object.entries(groupBySupervisors(data.loaded, "loaded")).map(([endTo, trips]: [string, GroupedTrip[]]) => (
                                            <Card key={endTo} className="mb-4">
                                                <CardHeader className="font-semibold text-md flex flex-row">{highlightText(endTo)}</CardHeader>
                                                <CardContent>
                                                    <Table className="w-max min-w-full">
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Sr No.</TableHead>
                                                                <TableHead>Vehicle No</TableHead>
                                                                <TableHead>Type/Capacity</TableHead>
                                                                <TableHead>Status</TableHead>
                                                                {trips.some(trip => Boolean(trip.loadingSupervisor)) && <TableHead>Loading Supervisor</TableHead>}
                                                                <TableHead>Update</TableHead>
                                                                {user?.Division.includes('Admin') && <TableHead>Superviser</TableHead>}
                                                                {user?.Division.includes('Admin') && <TableHead>Action</TableHead>}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {trips.sort((a: GroupedTrip, b: GroupedTrip) => a.status.localeCompare(b.status)).map((trip: GroupedTrip, index) => (
                                                                <TableRow onClick={(e: React.MouseEvent) => {
                                                                    const el = e.target as HTMLElement | null;
                                                                    // if the click happened inside the dropdown, don't open the drawer
                                                                    if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                                        setViewingTrip(trip._id)
                                                                    }
                                                                }} key={trip._id} className={trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "In Distillery" ? "bg-yellow-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Returning" ? "bg-gray-500" : ""}>
                                                                    <TableCell>{index + 1}</TableCell>
                                                                    <TableCell>{trip.VehicleNo}</TableCell>
                                                                    <TableCell>{trip.capacity}</TableCell>
                                                                    <TableCell>{trip.status === "Standing" ? "Not Programmed" : trip.status}</TableCell>
                                                                    {trips.some(trip => Boolean(trip.loadingSupervisor)) && <TableCell className='w-max'>{trip.loadingSupervisor}</TableCell>}
                                                                    <TableCell>{trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip.statusUpdate?.length - 1]?.status}</TableCell>
                                                                    {user?.Division.includes('Admin') && <TableCell>{trip.superwiser}</TableCell>}
                                                                    <TableCell className='flex gap-2'>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="outline" size="sm">
                                                                                    Update
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent className='dropdown'>
                                                                                {tripStatusUpdateVars.map((statupOpetion) => (
                                                                                    <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                                        {statupOpetion}
                                                                                    </DropdownMenuItem>
                                                                                ))}
                                                                                {trip.status == "On Way" && <DropdownMenuItem>
                                                                                    <Link href={{
                                                                                        pathname: "trans-app/unloading-tracker",
                                                                                        query: {
                                                                                            actionType: "report",
                                                                                            tripId: trip._id
                                                                                        }
                                                                                    }}>Reported</Link>
                                                                                </DropdownMenuItem>}
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                        <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip._id)}>
                                                                            <Eye />
                                                                        </Button>
                                                                        {!user?.Division.includes('Admin') && <Button variant="outline" size="sm">
                                                                            <Link href={`/trans-app/trip-update/${trip._id}`}>
                                                                                <Pen />
                                                                            </Link>
                                                                        </Button>}
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
                            }
                        </Accordion>
                        }
                    </div>
                </div >
            }
            {
                <AlertDialog open={Boolean(statusUpdate)} onOpenChange={() => setStatusUpdate(null)}>
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
                </AlertDialog>
            }
            <Drawer open={viewingTrip !== null} onOpenChange={() => setViewingTrip(null)}>
                {viewingTrip &&
                    <DrawerContent className="mx-auto w-full max-w-lg md:max-w-screen-xl px-4">
                        <DrawerHeader className="text-left">
                            <DrawerTitle>{findTripById(viewingTrip).VehicleNo}</DrawerTitle>
                            <DrawerDescription>{viewingTrip}</DrawerDescription>
                        </DrawerHeader>
                        <div className='flex flex-col gap-1 mb-4'>
                            <div className='flex gap-2'>
                                <strong>Route: </strong> {findTripById(viewingTrip).StartFrom} to {findTripById(viewingTrip).EndTo}
                            </div>
                            <div className='flex gap-2'>
                                <strong>Started at: </strong> {formatDate(findTripById(viewingTrip).StartDate)}
                            </div>
                            <div className='flex gap-2'>
                                <strong>Start Driver: </strong> {findTripById(viewingTrip).StartDriver}
                            </div>
                            {findTripById(viewingTrip).TallyLoadDetail && <>
                                <div className='flex gap-2'>
                                    <strong>Start Odometer: </strong> {findTripById(viewingTrip).TallyLoadDetail.StartOdometer}
                                </div>
                                <div className='flex gap-2'>
                                    <strong>Product: </strong> {findTripById(viewingTrip).TallyLoadDetail.Goods}
                                </div>
                            </>}
                            {findTripById(viewingTrip).ReportingDate && <div className='flex gap-2'>
                                <strong>Reported at: </strong> {formatDate(findTripById(viewingTrip).ReportingDate)}
                            </div>}
                        </div>
                        {findTripById(viewingTrip)?.TravelHistory &&
                            <>
                                <h4 className='font-semibold mt-4 mb-2'>Travel History</h4>
                                <div className='grid grid-cols-1 md:grid-cols-4 gap-2'>
                                    {findTripById(viewingTrip)?.TravelHistory
                                        ?.sort((a, b) => new Date(a.TrackUpdateDate).getTime() - new Date(b.TrackUpdateDate).getTime())
                                        .map((history, index) => (
                                            <Card key={index}>
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
                                </div>
                            </>
                        }
                        {findTripById(viewingTrip)?.statusUpdate &&
                            <>
                                <h4 className='font-semibold mt-4 mb-2'>Status Updates</h4>
                                <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                                    {findTripById(viewingTrip)?.statusUpdate
                                        ?.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                                        .map((history, index) => (
                                            <Card key={index}>
                                                <CardHeader>
                                                    <CardTitle className="text-md font-semibold">{formatDate(history.dateTime)}</CardTitle>
                                                    <CardDescription className='text-card-foreground'>
                                                        {history.status && <div><strong>Status:</strong> {history.status}</div>}
                                                        {history.comment && <div><strong>Comment:</strong> {history.comment}</div>}
                                                    </CardDescription>
                                                    <CardFooter className='text-muted-foreground'>by: {history.user.name}</CardFooter>
                                                </CardHeader>
                                            </Card>
                                        ))
                                    }
                                </div>
                            </>
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
