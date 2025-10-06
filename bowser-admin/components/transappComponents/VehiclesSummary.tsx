"use client"

import React, { useEffect, useState } from 'react'

import Link from 'next/link';
import useSWR, { mutate as globalMutate } from "swr";
import { Eye, Pen, X } from 'lucide-react';
import { toast } from 'sonner';

import Loading from '@/app/loading';
import { BASE_URL } from '@/lib/api'
import { TankersTrip, TransAppUser, TripsSummary, TripStatusUpdateEnums, tripStatusUpdateVars } from '@/types'
import { camelToWords, formatDate } from '@/lib/utils';
import { generateTripsReport } from "@/utils/excel";
import { useCache } from "@/src/context/CacheContext";

import CustomDrawer from "../custom-drawer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader } from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
    }[];
    driverStatus: number
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

const VehiclesSummary = ({ user }: { user: TransAppUser | undefined }) => {
    const { cache, setCache } = useCache();
    // const [data, setData] = useState<TripsSummary>();
    const [statusUpdate, setStatusUpdate] = useState<{ tripId: string, status: TripStatusUpdateEnums, comment?: string } | null>(cache.statusUpdate ?? null);
    const [filter, setFilter] = useState<'all' | 'loadedOnWay' | 'loadedReported' | 'emptyOnWay' | 'emptyReported' | 'emptyStanding' | 'outsideStandingVehicles' | 'notLoadedVehicles' | 'loaded' | 'otherStanding'>(cache.filter ?? "all");
    const [viewingTrip, setViewingTrip] = useState<string | null>(cache.viewingTrip ?? null);
    const [searchTerm, setSearchTerm] = useState(cache.searchTerm ?? "");
    const [allVehiclesAccordion, setAllVehiclesAccordion] = useState(cache.allVehiclesAccordion ?? "");

    useEffect(() => {
        setCache((prev) => {
            // avoid unnecessary updates
            if (
                prev.user === user &&
                prev.filter === filter &&
                prev.viewingTrip === viewingTrip &&
                prev.searchTerm === searchTerm &&
                prev.allVehiclesAccordion === allVehiclesAccordion &&
                JSON.stringify(prev.statusUpdate) === JSON.stringify(statusUpdate)
            ) {
                return prev; // no change → no re-render
            }

            return {
                ...prev,
                user,
                filter,
                viewingTrip,
                searchTerm,
                allVehiclesAccordion,
                statusUpdate,
            };
        });
    }, [user, filter, viewingTrip, searchTerm, allVehiclesAccordion, statusUpdate, setCache]);

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

    const { data, error, isLoading, mutate } = useSWR<TripsSummary>(
        user?._id
            ? `${BASE_URL}/trans-app/vehicles/get-summary/${user._id}?isAdmin=${user?.Division === "EthanolAdmin"}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 1000 * 60 * 30, // 30 minutes cache
        }
    );

    const reportedTrips = data?.empty?.reported?.trips ?? [];
    const lastStatus = (trip: any) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status ?? "";
    const outsideStanding = reportedTrips.filter(trip => {
        const s = lastStatus(trip);
        const endTo = (trip?.EndTo ?? "").toLowerCase();
        return !["Accident", "Breakdown", "Loaded"].includes(s) && !endTo.includes("gida office") && !endTo.includes("maintenece") && !endTo.includes("indian tanker") && !endTo.includes("maintenance") && trip?.driverStatus !== 0;
    });
    const otherStanding = reportedTrips.filter(trip => {
        const s = lastStatus(trip);
        const endTo = (trip?.EndTo ?? "").toLowerCase();
        // Only include reported trips that are not Accident/Breakdown and whose destination matches the specific keywords
        return s !== "Loaded" && ["Accident", "Breakdown"].includes(s) || (endTo.includes("gida office") || endTo.includes("maintenece") || endTo.includes("indian tanker") || endTo.includes("maintenance")) ||  trip?.driverStatus === 0;
    });

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

        return allTrips.find(trip => trip?._id === tripId)!;
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
                    const endTo = trip?.EndTo || "Unknown";
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
                return (t1?.VehicleNo ?? "").localeCompare(t2?.VehicleNo ?? "");
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
                    const supervisor = trip?.superwiser || "Unknown";
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
                return (t1?.VehicleNo ?? "").localeCompare(t2?.VehicleNo ?? "");
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

    // filter helper: applies current searchTerm across common trip fields
    const matchesSearch = (trip: any) => {
        if (!searchTerm) return true;
        const q = String(searchTerm).toLowerCase();
        const fields: Array<string | undefined | null> = [
            trip?.EndTo,
            trip?.superwiser,
            trip?.VehicleNo,
            trip?.StartFrom,
            // include both possible spellings used in data
            trip?.loadingSupervisor,
            trip?.loadingSuperVisor,
        ];
        return fields
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(q));
    };

    const updateTripStatus = async () => {
        if (!statusUpdate) return;

        const obj = {
            dateTime: new Date(),
            user: {
                _id: user?._id,
                name: user?.name,
            },
            status: statusUpdate.status,
            comment: statusUpdate.comment,
        };

        try {
            const url = `${BASE_URL}/trans-app/trip-update/update-trip-status/${statusUpdate.tripId}`;

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statusUpdate: obj }),
            });

            if (!res.ok) throw new Error("Network Request Failed");

            toast.success("Trip status updated successfully", { richColors: true });
            setStatusUpdate(null);

            await globalMutate(
                `${BASE_URL}/trans-app/vehicles/get-summary/${user?._id}?isAdmin=${user?.Division === "EthanolAdmin"}`,
                (current: TripsSummary | undefined) => {
                    if (!current) return current;

                    // clone safely
                    const updated: TripsSummary = JSON.parse(JSON.stringify(current));

                    const allTrips = [
                        ...(updated?.loaded?.onWay?.trips ?? []),
                        ...(updated?.loaded?.reported?.trips ?? []),
                        ...(updated?.empty?.onWay?.trips ?? []),
                        ...(updated?.empty?.standing?.trips ?? []),
                        ...(updated?.empty?.reported?.trips ?? []),
                    ];
                    console.log('all trips: ', allTrips);

                    const trip = allTrips.find((t) => t._id === statusUpdate!.tripId);
                    if (trip) {
                        if (!trip || !trip.statusUpdate) trip.statusUpdate = [];
                        trip.statusUpdate.push({
                            dateTime: new Date().toISOString(),
                            user: { _id: user!._id, name: user!.name },
                            status: statusUpdate!.status,
                            comment: statusUpdate!.comment,
                        });
                    }

                    return updated;
                }
            );

        } catch (error) {
            console.error(error);
            toast.error("Error", { description: String(error), richColors: true });
        }
    };

    return (
        <>
            {isLoading && <Loading />}
            {error &&
                <div className="text-red-500">{error.message || String(error)}</div>
            }
            {data &&
                <div className='mb-4'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                        <Card>
                            <CardHeader>
                                <CardTitle>Loaded Vehicles {data?.loaded?.onWay.count + data?.loaded?.reported.count}</CardTitle>
                            </CardHeader>
                            <CardContent className='grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2'>
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
                            <CardContent className='grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2'>
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
                                    <strong>Dipo Standing: </strong>{data?.empty?.standing.count}
                                </Button>
                                <Button
                                    variant="outline"
                                    className={`w-40 ${filter !== 'all' && filter === 'outsideStandingVehicles' ? 'bg-card text-card-foreground border-white' : ''}`}
                                    onClick={() => setFilter("outsideStandingVehicles")}
                                >
                                    {/* <strong>Outside Standing: </strong> {data.empty.reported.trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status !== "In Distillery").length - data.empty.reported.trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Loaded").length} */}
                                    <strong>Outside Standing: </strong> {outsideStanding.length || 0}
                                </Button>
                                <Button
                                    variant="outline"
                                    className={`w-40 ${filter !== 'all' && filter === 'loaded' ? 'bg-card text-card-foreground border-white' : ''}`}
                                    onClick={() => setFilter("loaded")}
                                >
                                    <strong>Loaded: </strong> {data.empty.reported.trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Loaded").length}
                                </Button>
                                <Button
                                    variant="outline"
                                    className={`w-40 ${filter !== 'all' && filter === 'otherStanding' ? 'bg-card text-card-foreground border-white' : ''}`}
                                    onClick={() => setFilter('otherStanding')}
                                >
                                    <strong>Other Standing: </strong> {otherStanding?.length || 0}
                                </Button>
                            </CardContent>
                            {/* <CardFooter></CardFooter> */}
                        </Card>
                        <div className='w-full flex justify-end my-3'>
                            <Button onClick={() => handleDownload()}>Download Report</Button>
                        </div>
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
                                placeholder="Search by destination, supervisor, or vehicle no..."
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
                                {(filter !== "outsideStandingVehicles" && filter !== "notLoadedVehicles" && filter !== "loaded" && filter !== "loadedReported" && filter !== "emptyStanding" && filter !== "otherStanding") &&
                                    <TableRow>
                                        <TableHead>SR No</TableHead>
                                        {user?.Division.includes('Admin') && <TableHead>Started From</TableHead>}
                                        {user?.Division.includes('Admin') && <TableHead>Start Date</TableHead>}
                                        <TableHead>{(filter === 'loadedOnWay' || filter === 'emptyOnWay') ? "Destination" : "End Location"}</TableHead>
                                        <TableHead>Vehicle No</TableHead>
                                        <TableHead>Type/Capacity</TableHead>
                                        <TableHead>Last Updated Location</TableHead>
                                        {filter === 'emptyReported' && <TableHead>Loading Supervisor</TableHead>}
                                        {filter === 'emptyReported' && <TableHead>Reached On</TableHead>}
                                        <TableHead>Current Status</TableHead>
                                        {user?.Division.includes('Admin') && <TableHead>Supervisor</TableHead>}
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                }
                                {
                                    filter == "loadedReported" &&
                                    <TableRow>
                                        <TableHead>SR No</TableHead>
                                        <TableHead>Vehicle No</TableHead>
                                        <TableHead>Loading Date</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>Reporting Date</TableHead>
                                        <TableHead>Days</TableHead>
                                        <TableHead>Comment</TableHead>
                                        {user?.Division.includes('Admin') && <TableHead>Vehicle Manager</TableHead>}
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                }
                                {
                                    filter == "emptyStanding" &&
                                    <TableRow>
                                        <TableHead>SR No</TableHead>
                                        <TableHead>Vehicle No</TableHead>
                                        <TableHead>Loading Date</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>Reporting Date</TableHead>
                                        <TableHead>Unloading Date</TableHead>
                                        <TableHead>Days</TableHead>
                                        <TableHead>Comment</TableHead>
                                        {user?.Division.includes('Admin') && <TableHead>Vehicle Manager</TableHead>}
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                }
                                {
                                    (filter == "outsideStandingVehicles" || filter == "notLoadedVehicles") &&
                                    <TableRow>
                                        <TableHead>SR No</TableHead>
                                        {user?.Division.includes('Admin') && <TableHead>Started From</TableHead>}
                                        {user?.Division.includes('Admin') && <TableHead>Start Date</TableHead>}
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
                                    (filter == "loaded" || filter == "otherStanding") &&
                                    <TableRow>
                                        <TableHead>SR No</TableHead>
                                        <TableHead>Vehicle No</TableHead>
                                        <TableHead>Type/Capacity</TableHead>
                                        {user?.Division.includes('Admin') && <TableHead>Vehicle Manager</TableHead>}
                                        <TableHead>{filter == "loaded" ? "Loading Station" : "Location"}</TableHead>
                                        {filter !== 'otherStanding' && <TableHead>Loading Supervisor</TableHead>}
                                        <TableHead>Reached On</TableHead>
                                        <TableHead>Status {filter == "loaded" && "Update Time"}</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                }
                            </TableHeader>
                            <TableBody>
                                {filter == 'loadedOnWay' &&
                                    data.loaded.onWay.trips
                                        .filter(matchesSearch)
                                        .sort((a, b) => a.EndTo.localeCompare(b.EndTo))
                                        .map((trip, index) =>
                                            <TableRow onClick={(e: React.MouseEvent) => {
                                                const el = e.target as HTMLElement | null;
                                                // if the click happened inside the dropdown, don't open the drawer
                                                if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                    setViewingTrip(trip?._id)
                                                }
                                            }} key={trip?._id} className={trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.driverStatus == 0 ? "text-destructive" : ""}>
                                                <TableCell>{index + 1}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.StartFrom || "")}</TableCell>}
                                                {user?.Division.includes('Admin') && <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo || "")}</TableCell>
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                <TableCell>{trip?.TravelHistory?.[trip?.TravelHistory?.length - 1]?.LocationOnTrackUpdate}</TableCell>
                                                <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell className='flex gap-2'>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                Update
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className='dropdown'>
                                                            {tripStatusUpdateVars.filter((option) => !["Loaded", "In Distillery", "In Depot"].includes(option)).map((statupOpetion) => (
                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                    {statupOpetion}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuItem>
                                                                <Link href={{
                                                                    pathname: "trans-app/unloading-tracker",
                                                                    query: {
                                                                        actionType: "report",
                                                                        tripId: trip?._id
                                                                    }
                                                                }}>Reported</Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                        <Eye />
                                                    </Button>
                                                    {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                        <Link href={`/trans-app/trip-update/${trip?._id}`}>
                                                            <Pen />
                                                        </Link>
                                                    </Button>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                }
                                {filter == 'loadedReported' &&
                                    data.loaded.reported.trips
                                        .filter(matchesSearch)
                                        .sort((a, b) => a.EndTo.localeCompare(b.EndTo)).sort((a, b) => Math.round(
                                            Math.abs(
                                                Number(new Date()) - Number(new Date(b.ReportingDate!))
                                            ) / (1000 * 60 * 60 * 24)
                                        ) - Math.round(
                                            Math.abs(
                                                Number(new Date()) - Number(new Date(a.ReportingDate!))
                                            ) / (1000 * 60 * 60 * 24)
                                        ))
                                        .map((trip, index) =>
                                            <TableRow onClick={(e: React.MouseEvent) => {
                                                const el = e.target as HTMLElement | null;
                                                if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                    setViewingTrip(trip?._id)
                                                }
                                            }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Depot" ? "bg-yellow-200 dark:text-background hover:bg-yellow-200" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                <TableCell>{highlightText(trip?.StartFrom || "")}</TableCell>
                                                <TableCell>{highlightText(trip?.EndTo || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.ReportingDate)}</TableCell>
                                                <TableCell>{
                                                    `${Math.round(
                                                        Math.abs(
                                                            Number(new Date()) - Number(new Date(trip?.ReportingDate!))
                                                        ) / (1000 * 60 * 60 * 24)
                                                    )} Days`
                                                }</TableCell>
                                                <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell className={`flex gap-2 ${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Depot" ? "dark:text-foreground" : ""}`}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                Update
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className='dropdown'>
                                                            {tripStatusUpdateVars.filter((option) => !["Loaded", "In Distillery"].includes(option)).map((statupOpetion) => (
                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                    {statupOpetion}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuItem>
                                                                <Link href={{
                                                                    pathname: "trans-app/unloading-tracker",
                                                                    query: {
                                                                        actionType: "unload",
                                                                        tripId: trip?._id
                                                                    }
                                                                }}>Unloaded</Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                        <Eye />
                                                    </Button>
                                                    {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                        <Link href={`/trans-app/trip-update/${trip?._id}`}>
                                                            <Pen />
                                                        </Link>
                                                    </Button>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                }
                                {filter == 'emptyOnWay' &&
                                    data.empty.onWay.trips
                                        .filter(matchesSearch)
                                        .sort((a, b) => a.EndTo.localeCompare(b.EndTo))
                                        .map((trip, index) =>
                                            <TableRow onClick={(e: React.MouseEvent) => {
                                                const el = e.target as HTMLElement | null;
                                                // if the click happened inside the dropdown, don't open the drawer
                                                if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                    setViewingTrip(trip?._id)
                                                }
                                            }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{index + 1}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.StartFrom || "")}</TableCell>}
                                                {user?.Division.includes('Admin') && <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo || "")}</TableCell>
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                <TableCell>{trip?.TravelHistory?.[trip?.TravelHistory?.length - 1]?.LocationOnTrackUpdate}</TableCell>
                                                <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell className='flex gap-2'>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                Update
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className='dropdown'>
                                                            {tripStatusUpdateVars.filter((option) => !["In Depot", "In Distillery", "Loaded"].includes(option)).map((statupOpetion) => (
                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                    {statupOpetion}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuItem>
                                                                <Link href={{
                                                                    pathname: "trans-app/loading-tracker",
                                                                    query: {
                                                                        actionType: "destinationChange",
                                                                        tripId: trip?._id
                                                                    }
                                                                }}>Change Destination</Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                <Link href={{
                                                                    pathname: "trans-app/loading-tracker",
                                                                    query: {
                                                                        actionType: "report",
                                                                        tripId: trip?._id
                                                                    }
                                                                }}>Reported</Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                        <Eye />
                                                    </Button>
                                                    {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                        <Link href={`/trans-app/trip-update/${trip?._id}`}>
                                                            <Pen />
                                                        </Link>
                                                    </Button>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                }
                                {filter == 'outsideStandingVehicles' &&
                                    outsideStanding
                                        .filter(matchesSearch)
                                        .sort((a, b) => a.EndTo.localeCompare(b.EndTo))
                                        .map((trip, index) =>
                                            <TableRow onClick={(e: React.MouseEvent) => {
                                                const el = e.target as HTMLElement | null;
                                                // if the click happened inside the dropdown, don't open the drawer
                                                if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                    setViewingTrip(trip?._id)
                                                }
                                            }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{index + 1}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.StartFrom || "")}</TableCell>}
                                                {user?.Division.includes('Admin') && <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>}
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo || "")}</TableCell>
                                                <TableCell>{highlightText(trip?.loadingSuperVisor || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.EmptyTripDetail.ReportDate)}</TableCell>
                                                <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status !== "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status + `: ${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment || ""}` : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment}</TableCell>
                                                <TableCell className='flex gap-2'>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                Update
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className='dropdown'>
                                                            {tripStatusUpdateVars.filter((option) => !["In Depot"].includes(option)).map((statupOpetion) => (
                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                    {statupOpetion}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuItem>
                                                                <Link href={{
                                                                    pathname: "trans-app/loading-tracker",
                                                                    query: {
                                                                        actionType: "destinationChange",
                                                                        tripId: trip?._id
                                                                    }
                                                                }}>Change Destination</Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                        <Eye />
                                                    </Button>
                                                    {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                        <Link href={`/trans-app/trip-update/${trip?._id}`}>
                                                            <Pen />
                                                        </Link>
                                                    </Button>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                }
                                {filter == 'otherStanding' &&
                                    otherStanding
                                        .filter(matchesSearch)
                                        .sort((a, b) => a.EndTo.localeCompare(b.EndTo))
                                        .map((trip, index) =>
                                            <TableRow onClick={(e: React.MouseEvent) => {
                                                const el = e.target as HTMLElement | null;
                                                // if the click happened inside the dropdown, don't open the drawer
                                                if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                    setViewingTrip(trip?._id)
                                                }
                                            }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{index + 1}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.StartFrom || "")}</TableCell>}
                                                {user?.Division.includes('Admin') && <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>}
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.EmptyTripDetail.ReportDate)}</TableCell>
                                                <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status !== "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status + `: ${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment || ""}` : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment}</TableCell>
                                                <TableCell className='flex gap-2'>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                Update
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className='dropdown'>
                                                            {tripStatusUpdateVars.filter((option) => !["In Depot", "In Distillery", "Loaded"].includes(option)).map((statupOpetion) => (
                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                    {statupOpetion}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuItem>
                                                                <Link href={{
                                                                    pathname: "trans-app/loading-tracker",
                                                                    query: {
                                                                        actionType: "destinationChange",
                                                                        tripId: trip?._id
                                                                    }
                                                                }}>Change Destination</Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                        <Eye />
                                                    </Button>
                                                    {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                        <Link href={`/trans-app/trip-update/${trip?._id}`}>
                                                            <Pen />
                                                        </Link>
                                                    </Button>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                }
                                {filter == 'loaded' &&
                                    data.empty.reported.trips
                                        .filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Loaded")
                                        .filter(matchesSearch)
                                        .sort((a, b) => a.EndTo.localeCompare(b.EndTo))
                                        .map((trip, index) =>
                                            <TableRow onClick={(e: React.MouseEvent) => {
                                                const el = e.target as HTMLElement | null;
                                                // if the click happened inside the dropdown, don't open the drawer
                                                if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                    setViewingTrip(trip?._id)
                                                }
                                            }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo || "")}</TableCell>
                                                <TableCell>{highlightText(trip?.loadingSuperVisor || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.EmptyTripDetail.ReportDate)}</TableCell>
                                                <TableCell>{formatDate(trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.dateTime)}</TableCell>
                                                <TableCell className='flex gap-2'>
                                                    {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                        <Link href={`/trans-app/trip-update/${trip?._id}`}>
                                                            <Pen />
                                                        </Link>
                                                    </Button>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                }
                                {filter == 'emptyReported' &&
                                    data.empty.reported.trips
                                        .filter(matchesSearch)
                                        .sort((a, b) => a.EndTo.localeCompare(b.EndTo))
                                        .map((trip, index) =>
                                            <TableRow onClick={(e: React.MouseEvent) => {
                                                const el = e.target as HTMLElement | null;
                                                // if the click happened inside the dropdown, don't open the drawer
                                                if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                    setViewingTrip(trip?._id)
                                                }
                                            }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{index + 1}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.StartFrom || "")}</TableCell>}
                                                {user?.Division.includes('Admin') && <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo || "")}</TableCell>
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                <TableCell>{trip?.TravelHistory?.[trip?.TravelHistory?.length - 1]?.LocationOnTrackUpdate}</TableCell>
                                                <TableCell>{highlightText(trip?.loadingSuperVisor || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.EmptyTripDetail.ReportDate)}</TableCell>
                                                <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell className='flex gap-2'>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                Update
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className='dropdown'>
                                                            {tripStatusUpdateVars.map((statupOpetion) => (
                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                    {statupOpetion}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuItem>
                                                                <Link href={{
                                                                    pathname: "trans-app/loading-tracker",
                                                                    query: {
                                                                        actionType: "destinationChange",
                                                                        tripId: trip?._id
                                                                    }
                                                                }}>Change Destination</Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                        <Eye />
                                                    </Button>
                                                    {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                        <Link href={`/trans-app/trip-update/${trip?._id}`}>
                                                            <Pen />
                                                        </Link>
                                                    </Button>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                }
                                {filter == 'emptyStanding' &&
                                    data.empty.standing.trips
                                        .filter(matchesSearch)
                                        .sort((a, b) => a.EndTo.localeCompare(b.EndTo))
                                        .map((trip, index) =>
                                            <TableRow onClick={(e: React.MouseEvent) => {
                                                const el = e.target as HTMLElement | null;
                                                // if the click happened inside the dropdown, don't open the drawer
                                                if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link')) {
                                                    setViewingTrip(trip?._id)
                                                }
                                            }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                <TableCell>{highlightText(trip?.StartFrom || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.ReportingDate)}</TableCell>
                                                <TableCell>{formatDate(trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.dateTime)}</TableCell>
                                                <TableCell>{
                                                    `${Math.round(
                                                        Math.abs(
                                                            Number(new Date()) - Number(new Date(trip?.ReportingDate!))
                                                        ) / (1000 * 60 * 60 * 24)
                                                    )} Days`
                                                }</TableCell>
                                                <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell className='flex gap-2'>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                Update
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className='dropdown'>
                                                            {tripStatusUpdateVars.filter((option) => !["In Depot", "In Distillery", "Loaded"].includes(option)).map((statupOpetion) => (
                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                    {statupOpetion}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuItem>
                                                                <Link href={{
                                                                    pathname: "trans-app/loading-planner",
                                                                    query: {
                                                                        tripId: trip?._id
                                                                    }
                                                                }}>Give Plane</Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                        <Eye />
                                                    </Button>
                                                    {!user?.Division.includes('Admin') && <Button variant="outline" size="sm" className='link'>
                                                        <Link href={`/trans-app/trip-update/${trip?._id}`}>
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
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(groupTripsByEndTo(data.empty, "empty"))
                                                .filter(([endTo]) => !searchTerm || endTo.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map(([endTo, trips], index) => (
                                                    <TableRow key={endTo} id={endTo} onClick={() => { setAllVehiclesAccordion("empty"); setSearchTerm(endTo) }}>
                                                        <TableHead>{index + 1}</TableHead>
                                                        <TableHead>{highlightText(endTo)}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip?.status === "On Way")?.length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip?.status === "Reported")?.length}</TableHead>
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
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(groupTripsByEndTo(data.loaded, "loaded"))
                                                .filter(([endTo]) => !searchTerm || endTo.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map(([endTo, trips], index) => (
                                                    <TableRow key={endTo} id={endTo} onClick={() => { setAllVehiclesAccordion("loaded"); setSearchTerm(endTo) }}>
                                                        <TableHead>{index + 1}</TableHead>
                                                        <TableHead>{highlightText(endTo)}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip?.status === "On Way")?.length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip?.status === "Reported")?.length}</TableHead>
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(groupTripsByEndTo(data.empty, "loaded")).map(([endTo, trips], index) => (
                                        <TableRow key={endTo} id={endTo}>
                                            <TableHead>{index + 1}</TableHead>
                                            <TableHead>{endTo}</TableHead>
                                            <TableHead>{trips.filter((trip) => trip?.status === "On Way")?.length}</TableHead>
                                            <TableHead>{trips.filter((trip) => trip?.status === "Reported")?.length}</TableHead>
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
                                                        <TableHead>{trips.filter((trip) => trip?.status === "On Way")?.length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip?.status === "Reported")?.length - trips.filter((trip) => trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Loaded").length}</TableHead>
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
                                                        <TableHead>{trips.filter((trip) => trip?.status === "On Way")?.length}</TableHead>
                                                        <TableHead>{trips.filter((trip) => trip?.status === "Reported")?.length}</TableHead>
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
                                                                    setViewingTrip(trip?._id)
                                                                }
                                                            }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                                <TableCell>{trip?.VehicleNo}</TableCell>
                                                                <TableCell>{trip?.capacity}</TableCell>
                                                                <TableCell>{trip?.status}</TableCell>
                                                                <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === 'Custom' ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status}</TableCell>
                                                                {user?.Division.includes('Admin') && <TableCell>{trip?.superwiser}</TableCell>}
                                                                <TableCell className='flex gap-2'>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="outline" size="sm">
                                                                                Update
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent className='dropdown'>
                                                                            {tripStatusUpdateVars.map((statupOpetion) => (
                                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                                    {statupOpetion}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                            {trip?.status == "On Way" && <DropdownMenuItem>
                                                                                <Link href={{
                                                                                    pathname: "trans-app/unloading-tracker",
                                                                                    query: {
                                                                                        actionType: "report",
                                                                                        tripId: trip?._id
                                                                                    }
                                                                                }}>Reported</Link>
                                                                            </DropdownMenuItem>}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                                        <Eye />
                                                                    </Button>
                                                                    {!user?.Division.includes('Admin') && <Button className='link' variant="outline" size="sm">
                                                                        <Link href={`/trans-app/trip-update/${trip?._id}`}>
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
                                                            {trips.some(trip => Boolean(trip?.loadingSupervisor)) && <TableHead>Loading Supervisor</TableHead>}
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
                                                                    setViewingTrip(trip?._id)
                                                                }
                                                            }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                                <TableCell>{trip?.VehicleNo}</TableCell>
                                                                <TableCell>{trip?.capacity}</TableCell>
                                                                <TableCell>{trip?.status === "Standing" ? "Not Programmed" : trip?.status}</TableCell>
                                                                {trips.some(trip => Boolean(trip?.loadingSupervisor)) && <TableCell>{trip?.loadingSupervisor}</TableCell>}
                                                                <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status}</TableCell>
                                                                {user?.Division.includes('Admin') && <TableCell>{trip?.superwiser}</TableCell>}
                                                                <TableCell className='flex gap-2'>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="outline" size="sm">
                                                                                Update
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent className='dropdown'>
                                                                            {tripStatusUpdateVars.map((statupOpetion) => (
                                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                                    {statupOpetion}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                            {(trip?.status == "Reported" || trip?.status == "On Way") &&
                                                                                <DropdownMenuItem>
                                                                                    <Link href={{
                                                                                        pathname: "trans-app/loading-tracker",
                                                                                        query: {
                                                                                            actionType: "destinationChange",
                                                                                            tripId: trip?._id
                                                                                        }
                                                                                    }}>Change Destination</Link>
                                                                                </DropdownMenuItem>
                                                                            }
                                                                            {trip?.status == "On Way" && <DropdownMenuItem>
                                                                                <Link href={{
                                                                                    pathname: "trans-app/loading-tracker",
                                                                                    query: {
                                                                                        actionType: "report",
                                                                                        tripId: trip?._id
                                                                                    }
                                                                                }}>Reported</Link>
                                                                            </DropdownMenuItem>}
                                                                            {trip?.status == "Standing" &&
                                                                                <DropdownMenuItem>
                                                                                    <Link href={{
                                                                                        pathname: "trans-app/loading-planner",
                                                                                        query: {
                                                                                            tripId: trip?._id
                                                                                        }
                                                                                    }}>Give Plane</Link>
                                                                                </DropdownMenuItem>}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                    <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                                        <Eye />
                                                                    </Button>
                                                                    {!user?.Division.includes('Admin') && <Button variant="outline" size="sm">
                                                                        <Link href={`/trans-app/trip-update/${trip?._id}`}>
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
                                                                        setViewingTrip(trip?._id)
                                                                    }
                                                                }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                                    <TableCell>{index + 1}</TableCell>
                                                                    <TableCell>{trip?.VehicleNo}</TableCell>
                                                                    <TableCell>{trip?.capacity}</TableCell>
                                                                    {user?.Division.includes('Admin') && <TableCell>{trip?.superwiser}</TableCell>}
                                                                    <TableCell>{trip?.EndTo}</TableCell>
                                                                    <TableCell>{trip?.loadingSupervisor}</TableCell>
                                                                    <TableCell>{formatDate(trip?.LoadTripDetail?.ReportDate || trip?.LoadTripDetail?.UnloadDate || trip?.TallyLoadDetail?.ReportedDate || trip?.TallyLoadDetail?.UnloadingDate)}</TableCell>
                                                                    <TableCell>{trip?.status === "Standing" ? "Not Programmed" : trip?.status}</TableCell>
                                                                    <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status}</TableCell>
                                                                    <TableCell className='flex gap-2'>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="outline" size="sm">
                                                                                    Update
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent className='dropdown'>
                                                                                {tripStatusUpdateVars.map((statupOpetion) => (
                                                                                    <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                                        {statupOpetion}
                                                                                    </DropdownMenuItem>
                                                                                ))}
                                                                                {(trip?.status == "Reported" || trip?.status == "On Way") &&
                                                                                    <DropdownMenuItem>
                                                                                        <Link href={{
                                                                                            pathname: "trans-app/loading-tracker",
                                                                                            query: {
                                                                                                actionType: "destinationChange",
                                                                                                tripId: trip?._id
                                                                                            }
                                                                                        }}>Change Destination</Link>
                                                                                    </DropdownMenuItem>
                                                                                }
                                                                                {trip?.status == "On Way" && <DropdownMenuItem>
                                                                                    <Link href={{
                                                                                        pathname: "trans-app/loading-tracker",
                                                                                        query: {
                                                                                            actionType: "report",
                                                                                            tripId: trip?._id
                                                                                        }
                                                                                    }}>Reported</Link>
                                                                                </DropdownMenuItem>}
                                                                                {trip?.status == "Standing" &&
                                                                                    <DropdownMenuItem>
                                                                                        <Link href={{
                                                                                            pathname: "trans-app/loading-planner",
                                                                                            query: {
                                                                                                tripId: trip?._id
                                                                                            }
                                                                                        }}>Give Plane</Link>
                                                                                    </DropdownMenuItem>}
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                        <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                                            <Eye />
                                                                        </Button>
                                                                        {!user?.Division.includes('Admin') && <Button variant="outline" size="sm">
                                                                            <Link href={`/trans-app/trip-update/${trip?._id}`}>
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
                                                                {trips.some(trip => Boolean(trip?.loadingSupervisor)) && <TableHead>Loading Supervisor</TableHead>}
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
                                                                        setViewingTrip(trip?._id)
                                                                    }
                                                                }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-red-500" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                                    <TableCell>{index + 1}</TableCell>
                                                                    <TableCell>{trip?.VehicleNo}</TableCell>
                                                                    <TableCell>{trip?.capacity}</TableCell>
                                                                    <TableCell>{trip?.status === "Standing" ? "Not Programmed" : trip?.status}</TableCell>
                                                                    {trips.some(trip => Boolean(trip?.loadingSupervisor)) && <TableCell className='w-max'>{trip?.loadingSupervisor}</TableCell>}
                                                                    <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status}</TableCell>
                                                                    {user?.Division.includes('Admin') && <TableCell>{trip?.superwiser}</TableCell>}
                                                                    <TableCell className='flex gap-2'>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="outline" size="sm">
                                                                                    Update
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent className='dropdown'>
                                                                                {tripStatusUpdateVars.map((statupOpetion) => (
                                                                                    <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                                        {statupOpetion}
                                                                                    </DropdownMenuItem>
                                                                                ))}
                                                                                {trip?.status == "On Way" && <DropdownMenuItem>
                                                                                    <Link href={{
                                                                                        pathname: "trans-app/unloading-tracker",
                                                                                        query: {
                                                                                            actionType: "report",
                                                                                            tripId: trip?._id
                                                                                        }
                                                                                    }}>Reported</Link>
                                                                                </DropdownMenuItem>}
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                        <Button variant="outline" size="sm" onClick={() => setViewingTrip(trip?._id)}>
                                                                            <Eye />
                                                                        </Button>
                                                                        {!user?.Division.includes('Admin') && <Button variant="outline" size="sm">
                                                                            <Link href={`/trans-app/trip-update/${trip?._id}`}>
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

            {viewingTrip !== null &&
                <CustomDrawer key={viewingTrip} title={findTripById(viewingTrip)?.VehicleNo} description={viewingTrip}>
                    <div className="max-h-[60svh] overflow-y-auto">
                        <div className='flex flex-col gap-1 mb-4'>
                            <div className='flex gap-2'>
                                <strong>Route: </strong> {findTripById(viewingTrip)?.StartFrom} to {findTripById(viewingTrip)?.EndTo}
                            </div>
                            <div className='flex gap-2'>
                                <strong>Started at: </strong> {formatDate(findTripById(viewingTrip)?.StartDate).split(",")[0]} <span className={findTripById(viewingTrip)?.LoadStatus === 0 ? "text-red-500" : "text-green-500"}>{findTripById(viewingTrip)?.LoadStatus === 0 ? "Empty" : "Loaded"}</span>
                            </div>
                            <div className='flex gap-2'>
                                <strong>Start Driver: </strong> {findTripById(viewingTrip)?.StartDriver}
                            </div>
                            {findTripById(viewingTrip)?.TallyLoadDetail && <>
                                <div className='flex gap-2'>
                                    <strong>Start Odometer: </strong> {findTripById(viewingTrip)?.TallyLoadDetail.StartOdometer}
                                </div>
                                <div className='flex gap-2'>
                                    <strong>Product: </strong> {findTripById(viewingTrip)?.TallyLoadDetail.Goods}
                                </div>
                            </>}
                            {findTripById(viewingTrip)?.ReportingDate && <div className='flex gap-2'>
                                <strong>Reported at: </strong> {formatDate(findTripById(viewingTrip)?.ReportingDate)}
                            </div>}
                        </div>
                        {findTripById(viewingTrip)?.TravelHistory &&
                            <>
                                <h4 className='font-semibold mt-4 mb-2'>Travel History</h4>
                                <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
                                    {findTripById(viewingTrip)?.TravelHistory
                                        ?.sort((a, b) => new Date(a.TrackUpdateDate).getTime() - new Date(b.TrackUpdateDate).getTime())
                                        .map((history, index) => (
                                            <Card key={index}>
                                                <CardHeader>
                                                    <CardTitle className="text-md font-semibold">{(history.ManagerComment.match(/#(\w+)/) || [])[1] + " marked on " + formatDate(history.TrackUpdateDate)}</CardTitle>
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
                                <div className='grid grid-cols-1 md:grid-cols-4 gap-2'>
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
                                                    <CardFooter className='text-muted-foreground p-0'>by: {history.user.name}</CardFooter>
                                                </CardHeader>
                                            </Card>
                                        ))
                                    }
                                </div>
                            </>
                        }
                    </div>
                </CustomDrawer>
            }
        </>
    )
}

export default VehiclesSummary
