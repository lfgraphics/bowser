"use client"

import React, { useEffect, useState, useRef, useMemo } from 'react'
import Link from 'next/link';

import { Eye, Pen, X, Share2, Download } from 'lucide-react';
import { toast } from 'sonner';

import Loading from '@/app/loading';

import { TransAppUser, TripsSummary, TripStatusUpdateEnums, tripStatusUpdateVars } from '@/types'
import { camelToWords, formatDate } from '@/lib/utils';
import { generateTripsReport } from "@/utils/excel";


import CustomDrawer from "../custom-drawer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    ExcelTable as Table,
    ExcelTableBody as TableBody,
    ExcelTableCell as TableCell,
    ExcelTableHead as TableHead,
    ExcelTableHeader as TableHeader,
    ExcelTableRow as TableRow
} from "@codvista/cvians-excel-table"
import AdminLoadingPlanner from '../AdminLoadingPlanner';
import MainView from './newUI/MainView';
import { useMainView } from '@/hooks/useMainView';
import VehiclesMainFilter from './newUI/VehiclesMainFilter';
import { TripsStats } from '@/types';



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

const VehiclesSummaryOptimized = ({ user }: { user: TransAppUser | undefined }) => {
    const isAdmin = user?.Division === "EthanolAdmin";
    const {
        stats,
        bucketData: data,
        pagination,
        totalCount: totalRecords,
        selectedFilter: filter,
        setSelectedFilter: setFilter,
        searchTerm,
        setSearchTerm,
        sortBy,
        setSortBy,
        direction,
        setDirection,
        page,
        setPage,
        pageSize,
        setPageSize,
        statusUpdate,
        setStatusUpdate,
        icon,
        isLoading,
        hasError: mainError,
        handleFilterClick,
        mutateStats,
        mutateBucket,
        updateTripStatus
    } = useMainView(user?._id, isAdmin, user?.name);

    const [viewingTrip, setViewingTrip] = useState<string | null>(null);
    const [allVehiclesAccordion, setAllVehiclesAccordion] = useState("");
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState<{ url: string; blob: Blob; filename: string } | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const totalPages = pagination?.totalPages || 0;
    const paginatedData = data || [];
    const counts = stats;


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

        const state = { drawer: true }
        window.history.pushState(state, "")

        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.drawer) {
                setViewingTrip(null)
            }
        }

        window.addEventListener("popstate", handlePopState)

        return () => {
            window.removeEventListener("popstate", handlePopState)
            if (window.history.state?.drawer) {
                window.history.back()
            }
        }
    }, [viewingTrip])

    const handleDownload = () => {
        if (!stats) return;

        // Create a proper TripsSummary structure for the current filter
        const baseSummary: TripsSummary = {
            empty: {
                onWay: { count: 0, trips: [] },
                reported: { count: 0, trips: [] },
                standing: { count: 0, trips: [] }
            },
            loaded: {
                onWay: { count: 0, trips: [] },
                reported: { count: 0, trips: [] }
            }
        };

        // This is a bit of a hack to satisfy the legacy generateTripsReport if it expects specific categories
        // In reality, we might want to update generateTripsReport to handle generic buckets
        if (filter.includes('loaded')) {
            baseSummary.loaded.onWay = { count: paginatedData.length, trips: paginatedData as any };
        } else {
            baseSummary.empty.onWay = { count: paginatedData.length, trips: paginatedData as any };
        }

        generateTripsReport({
            summary: baseSummary,
            username: user!.name,
            isAdmin: user?.Division === "EthanolAdmin",
            fileName: `Tankers_Report_Generated_at_${formatDate(new Date())}_by_${user?.name}.xlsx`,
        });
    };

    const findTripById = (id: string | null) => {
        if (!id) return undefined;
        return (data || []).find((trip: any) => trip._id === id);
    };

    const tripForDrawer = useMemo(() => viewingTrip ? findTripById(viewingTrip) : undefined, [viewingTrip, data]);

    const groupedEmptyByEndTo = useMemo(() => {
        if (!data || filter !== 'all') return {};
        return data.filter((t: any) => t.LoadStatus === 0).reduce((acc: any, trip: any) => {
            const endTo = trip.EndTo || 'Unknown';
            if (!acc[endTo]) acc[endTo] = [];
            acc[endTo].push({ ...trip, status: trip.status || (trip.EmptyTripDetail?.ReportDate ? "Reported" : "On Way") });
            return acc;
        }, {});
    }, [data, filter]);

    const groupedLoadedByEndTo = useMemo(() => {
        if (!data || filter !== 'all') return {};
        return data.filter((t: any) => t.LoadStatus !== 0).reduce((acc: any, trip: any) => {
            const endTo = trip.EndTo || 'Unknown';
            if (!acc[endTo]) acc[endTo] = [];
            acc[endTo].push({ ...trip, status: trip.status || "On Way" });
            return acc;
        }, {});
    }, [data, filter]);

    const groupedEmptyBySupervisor = useMemo(() => {
        if (!data || filter !== 'all') return {};
        return data.filter((t: any) => t.LoadStatus === 0).reduce((acc: any, trip: any) => {
            const supervisor = trip.superwiser || 'Unknown';
            if (!acc[supervisor]) acc[supervisor] = [];
            acc[supervisor].push({ ...trip, status: trip.status || (trip.EmptyTripDetail?.ReportDate ? "Reported" : "On Way") });
            return acc;
        }, {});
    }, [data, filter]);

    const groupedLoadedBySupervisor = useMemo(() => {
        if (!data || filter !== 'all') return {};
        return data.filter((t: any) => t.LoadStatus !== 0).reduce((acc: any, trip: any) => {
            const supervisor = trip.superwiser || 'Unknown';
            if (!acc[supervisor]) acc[supervisor] = [];
            acc[supervisor].push({ ...trip, status: trip.status || "On Way" });
            return acc;
        }, {});
    }, [data, filter]);


    return (
        <>
            {isLoading && <Loading />}
            {!data && !stats && 'No data, Loading...'}
            {mainError &&
                <div className="text-red-500">{mainError.message || String(mainError)}</div>
            }
            {(data || stats) &&
                <>
                    <div className='md:hidden'>
                        <MainView
                            user={user}
                            stats={stats}
                            bucketData={data}
                            pagination={pagination}
                            selectedFilter={filter}
                            isAdmin={isAdmin}
                            handleFilterClick={handleFilterClick}
                            searchTerm={searchTerm || ""}
                            setSearchTerm={setSearchTerm}
                            sortBy={sortBy || ""}
                            setSortBy={setSortBy}
                            direction={direction || "asc"}
                            setDirection={setDirection}
                            page={page || 1}
                            setPage={setPage}
                            pageSize={pageSize}
                            setPageSize={setPageSize}
                            icon={icon}
                            isLoading={isLoading}
                            hasError={mainError}
                            statusUpdate={statusUpdate}
                            setStatusUpdate={setStatusUpdate}
                            updateTripStatus={updateTripStatus}
                            mutateStats={mutateStats}
                            mutateBucket={mutateBucket}
                        />
                    </div>
                    <div className='mb-4 hidden md:block'>
                        <div className="flex gap-4 overflow-y-auto">
                            {stats && Object.entries(stats).map(([key, item]) => (
                                item ? <VehiclesMainFilter
                                    key={key}
                                    mainFilterKey={key}
                                    icon={item.icon}
                                    filters={(item.filters || []).map((f: any) => ({
                                        icon: f.icon,
                                        count: f.count,
                                        label: f.label || f.lable || "",
                                        filterKey: `${key}_${(f.label || f.lable || "").toLowerCase().replace(/\s+/g, '_')}`
                                    }))}
                                    selectedFilter={filter}
                                    onFilterClick={handleFilterClick}
                                /> : null
                            ))}
                        </div>
                    </div>
                    <div className='hidden md:flex items-center justify-center text-center'>
                        <div className='md:flex justify-center gap-2 my-4 hidden'>
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
                            <Button onClick={() => handleDownload()}>Download Report</Button>
                            {filter !== 'all' && (
                                <Button
                                    variant="outline"
                                    disabled={isGeneratingImage}
                                    onClick={async () => {
                                        setIsGeneratingImage(true);
                                        try {
                                            if (!tableRef.current) {
                                                throw new Error('Table not found');
                                            }

                                            // Store original styles
                                            const originalMaxHeight = tableRef.current.style.maxHeight;
                                            const originalOverflow = tableRef.current.style.overflow;

                                            // Temporarily remove height constraint to capture full content
                                            tableRef.current.style.maxHeight = 'none';
                                            tableRef.current.style.overflow = 'visible';

                                            // Wait for layout to update
                                            await new Promise(resolve => setTimeout(resolve, 100));

                                            // Clone and clean the table container
                                            const clonedTable = tableRef.current.cloneNode(true) as HTMLElement;
                                            const interactiveElements = clonedTable.querySelectorAll('button, a, input, select, textarea, [role="button"], .dropdown, .link');
                                            interactiveElements.forEach(el => el.remove());

                                            // Restore original styles immediately
                                            tableRef.current.style.maxHeight = originalMaxHeight;
                                            tableRef.current.style.overflow = originalOverflow;

                                            const bodyContent = `
                                                <div class="p-8">
                                                    <h1 class="text-2xl font-bold mb-4 text-gray-900">${camelToWords(filter)} - Vehicles Report</h1>
                                                    <div class="text-sm text-gray-600 mb-4">Generated on ${formatDate(new Date())} by <span class="font-bold">${user?.name}</span></div>
                                                    ${clonedTable.innerHTML}
                                                </div>
                                            `;

                                            const response = await fetch('/api/html-to-image', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    bodyContent,
                                                    useTailwind: true,
                                                    backgroundColor: 'bg-white',
                                                    format: 'png',
                                                    quality: 90,
                                                    filename: `${camelToWords(filter)}_${formatDate(new Date())}.png`,
                                                    width: 1920,
                                                    fullPage: true,
                                                }),
                                            });

                                            if (!response.ok) {
                                                const error = await response.json();
                                                throw new Error(error.error || 'Failed to generate image');
                                            }

                                            const blob = await response.blob();
                                            const filename = `${camelToWords(filter)}_${formatDate(new Date())}.png`;
                                            const url = URL.createObjectURL(blob);

                                            // Show preview dialog
                                            setImagePreview({ url, blob, filename });
                                            toast.success('Report generated successfully!');
                                        } catch (error) {
                                            console.error(error);
                                            toast.error('Failed to share table', { description: String(error) });
                                        } finally {
                                            setIsGeneratingImage(false);
                                        }
                                    }}
                                >
                                    <Share2 className="mr-2 h-4 w-4" />
                                    {isGeneratingImage ? 'Generating...' : 'Share Table'}
                                </Button>
                            )}
                        </div>
                        {/* <div className='w-full flex justify-end gap-2 my-3'>
                        </div> */}
                        {filter !== 'all' &&
                            <div className='flex items-center gap-2'>
                                {/* <span className="font-bold text-lg">{camelToWords(filter).replace(/_/g, ' ')}</span> */}
                                <Button variant="outline" className='w-max my-4' onClick={() => setFilter('all')}>View All Vehicles Summary</Button>
                            </div>
                        }
                    </div>
                    {
                        filter !== 'all' &&
                        <div ref={tableRef} className='relative w-full overflow-y-auto max-h-[46svh] hidden md:block'>
                            <Table className='w-full min-w-max border-none bg-background'>
                                <TableHeader>
                                    {(filter !== "emptyForLoading_outside_standing" && filter !== "emptyForLoading_factory_in" && filter !== "notLoadedVehicles" && filter !== "loaded" && filter !== "loaded_reported" && filter !== "emptyForLoading_depo_standing" && filter !== "emptyOther_loaded" && filter !== "emptyOther_standing" && filter !== "emptyOther_other_standing" && filter !== "emptyOther_depot_standing" && !filter.startsWith("underMaintenance")) &&
                                        <TableRow>
                                            <TableHead sortable dataType='number'>SR No</TableHead>
                                            <TableHead>Status</TableHead>
                                            {user?.Division?.includes('Admin') && <TableHead filterable sortable dataType='string'>Started From</TableHead>}
                                            {user?.Division?.includes('Admin') && <TableHead filterable sortable dataType='date'>Start Date</TableHead>}
                                            <TableHead filterable sortable dataType='string'>{(filter === 'loadedOnWay' || filter === 'emptyOnWay') ? "Destination" : "End Location"}</TableHead>
                                            <TableHead filterable sortable dataType='string'>Vehicle No</TableHead>
                                            <TableHead filterable sortable dataType='string'>Type/Capacity</TableHead>
                                            <TableHead filterable sortable dataType='string'>Last Updated Location</TableHead>
                                            {filter === 'emptyReported' && <TableHead filterable sortable dataType='string'>Loading Supervisor</TableHead>}
                                            {filter === 'emptyReported' && <TableHead filterable sortable dataType='date'>Reached On</TableHead>}
                                            <TableHead filterable sortable dataType='string'>Current Status</TableHead>
                                            {user?.Division?.includes('Admin') && <TableHead filterable sortable dataType='string'>Supervisor</TableHead>}
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    }
                                    {
                                        filter == "loaded_reported" &&
                                        <TableRow>
                                            <TableHead sortable dataType='number'>SR No</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead sortable filterable dataType='string'>Vehicle No</TableHead>
                                            <TableHead sortable filterable dataType='date'>Loading Date</TableHead>
                                            <TableHead sortable filterable dataType='string'>Qty</TableHead>
                                            <TableHead sortable filterable dataType='string'>From</TableHead>
                                            <TableHead sortable filterable dataType='string'>To</TableHead>
                                            <TableHead sortable filterable dataType='date'>Reporting Date</TableHead>
                                            <TableHead sortable filterable dataType='number'>Days</TableHead>
                                            <TableHead sortable filterable dataType='string'>Comment</TableHead>
                                            {user?.Division?.includes('Admin') && <TableHead filterable sortable dataType='string'>Vehicle Manager</TableHead>}
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    }
                                    {
                                        (filter == "emptyForLoading_depo_standing" || filter == "emptyOther_loaded") &&
                                        <TableRow>
                                            <TableHead sortable dataType='number'>SR No</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead filterable sortable dataType='string'>Vehicle No</TableHead>
                                            <TableHead filterable sortable dataType='string'>Location</TableHead>
                                            <TableHead filterable sortable dataType='date'>Loading Date</TableHead>
                                            <TableHead filterable sortable dataType='string'>Qty</TableHead>
                                            <TableHead filterable sortable dataType='string'>From</TableHead>
                                            <TableHead filterable sortable dataType='date'>Reporting Date</TableHead>
                                            <TableHead filterable sortable dataType='date'>Unloading Date</TableHead>
                                            <TableHead filterable sortable dataType='number'>Days</TableHead>
                                            <TableHead filterable sortable dataType='string'>Comment</TableHead>
                                            {user?.Division?.includes('Admin') && <TableHead filterable sortable dataType='string'>Vehicle Manager</TableHead>}
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    }
                                    {
                                        (filter == "emptyForLoading_outside_standing" || filter == "emptyForLoading_factory_in" || filter == "underMaintenance_outside_standing" || filter == "underMaintenance_factory_in" || filter == "notLoadedVehicles") &&
                                        <TableRow>
                                            <TableHead sortable dataType='number'>SR No</TableHead>
                                            <TableHead>Status</TableHead>
                                            {user?.Division?.includes('Admin') && <TableHead sortable dataType='string'>Started From</TableHead>}
                                            {user?.Division?.includes('Admin') && <TableHead sortable dataType='date'>Start Date</TableHead>}
                                            <TableHead filterable sortable dataType='string'>Vehicle No</TableHead>
                                            <TableHead filterable sortable dataType='string'>Type/Capacity</TableHead>
                                            {user?.Division?.includes('Admin') && <TableHead filterable sortable dataType='string'>Vehicle Manager</TableHead>}
                                            <TableHead filterable sortable dataType='string'>Loading Station</TableHead>
                                            <TableHead filterable sortable dataType='string'>Loading Supervisor</TableHead>
                                            <TableHead filterable sortable dataType='date'>Reached On</TableHead>
                                            <TableHead filterable sortable dataType='string'>{filter == "emptyForLoading_outside_standing" ? "Current Status" : "Reason"}</TableHead>
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    }{
                                        (filter == "loaded" || filter == "emptyOther_standing" || filter == "emptyOther_other_standing" || filter == "emptyOther_depot_standing" || filter.startsWith("underMaintenance")) && !user?.Division?.includes('Admin') &&
                                        <TableRow>
                                            <TableHead sortable dataType='number'>SR No</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead filterable sortable dataType='string'>Vehicle No</TableHead>
                                            <TableHead filterable sortable dataType='string'>Type/Capacity</TableHead>
                                            {user?.Division.includes('Admin') && <TableHead filterable sortable dataType='string'>Vehicle Manager</TableHead>}
                                            <TableHead filterable sortable dataType='string'>{filter == "loaded" ? "Loading Station" : "Location"}</TableHead>
                                            {filter !== 'emptyOther_standing' && <TableHead filterable sortable dataType='string'>Loading Supervisor</TableHead>}
                                            <TableHead filterable sortable dataType='date'>Reached On</TableHead>
                                            <TableHead filterable sortable dataType='string'>Status {filter == "loaded" && "Update Time"}</TableHead>
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    }
                                    {
                                        filter == "loaded" && user?.Division?.includes('Admin') &&
                                        <TableRow>
                                            <TableHead sortable dataType='number'>SR No</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead filterable sortable dataType='string'>Vehicle No</TableHead>
                                            <TableHead filterable sortable dataType='string'>Type/Capacity</TableHead>
                                            {user?.Division.includes('Admin') && <TableHead filterable sortable dataType='string'>Vehicle Manager</TableHead>}
                                            <TableHead filterable sortable dataType='string'>{filter == "loaded" ? "Loading Station" : "Location"}</TableHead>
                                            <TableHead filterable sortable dataType='string'>Loading Supervisor</TableHead>
                                            <TableHead filterable sortable dataType='date'>Reached On</TableHead>
                                            <TableHead filterable sortable dataType='string'>Status {filter == "loaded" && "Update Time"}</TableHead>
                                            {!user?.Division?.includes('Admin') && <TableHead>Action</TableHead>}
                                        </TableRow>
                                    }
                                    {
                                        (filter == "emptyOther_standing" || filter == "emptyOther_other_standing" || filter == "emptyOther_depot_standing" || filter.startsWith("underMaintenance")) && user?.Division?.includes('Admin') &&
                                        <TableRow>
                                            <TableHead sortable dataType='number'>SR No</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead filterable sortable dataType='string'>From</TableHead>
                                            <TableHead filterable sortable dataType='string'>Start Date</TableHead>
                                            <TableHead filterable sortable dataType='string'>Vehicle No</TableHead>
                                            <TableHead filterable sortable dataType='string'>Type/Capacity</TableHead>
                                            <TableHead filterable sortable dataType='string'>Supervisor</TableHead>
                                            <TableHead filterable sortable dataType='string'>To</TableHead>
                                            <TableHead filterable sortable dataType='date'>Reached On</TableHead>
                                            <TableHead filterable sortable dataType='string'>Last Update</TableHead>
                                            <TableHead>Actions</TableHead>

                                        </TableRow>
                                    }
                                </TableHeader>
                                <TableBody>
                                    {(filter == 'loaded_total_on_way' || filter == 'loaded_total_loaded' || filter == 'loaded') &&
                                        (paginatedData as any[]).map((trip: any, index: number) =>
                                            <TableRow key={trip?._id} className={trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : trip?.driverStatus == 0 ? "text-destructive" : ""}>
                                                <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                                                <TableCell>
                                                    <img
                                                        src={trip?.LoadStatus === 1 ? "/icons/newThemeIcons/loaded-vehicles.svg" : "/icons/newThemeIcons/empty-vehicles.svg"}
                                                        alt={trip?.LoadStatus === 1 ? "Loaded" : "Empty"}
                                                        className="w-8 h-8 object-contain"
                                                    />
                                                </TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.StartFrom.split(':')[1] || trip?.StartFrom || "")}</TableCell>}
                                                {user?.Division.includes('Admin') && <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo.split(':')[1] || trip?.EndTo || "")}</TableCell>
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
                                                    {trip?.superwiser && user?.Division.includes('Admin') &&
                                                        <AdminLoadingPlanner trip={trip} manager={trip.superwiser} trigger="Order" type="new"></AdminLoadingPlanner>
                                                    }
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
                                    {filter == 'loaded_reported' &&
                                        (paginatedData as any[]).map((trip: any, index: number) =>
                                            <TableRow key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "In Depot" ? "bg-yellow-200 dark:text-background hover:bg-yellow-200" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                                                <TableCell>
                                                    <img
                                                        src={trip?.LoadStatus === 1 ? "/icons/newThemeIcons/loaded-vehicles.svg" : "/icons/newThemeIcons/empty-vehicles.svg"}
                                                        alt={trip?.LoadStatus === 1 ? "Loaded" : "Empty"}
                                                        className="w-8 h-8 object-contain"
                                                    />
                                                </TableCell>
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.StartDate)?.split(',')[0]}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                <TableCell>{highlightText(trip?.StartFrom.split(':')[1] || trip?.StartFrom || "")}</TableCell>
                                                <TableCell>{highlightText(trip?.EndTo.split(':')[1] || trip?.EndTo || "")}</TableCell>
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
                                                    {trip?.superwiser && user?.Division.includes('Admin') &&
                                                        <AdminLoadingPlanner trip={trip} manager={trip.superwiser} trigger="Order" type="new"></AdminLoadingPlanner>
                                                    }
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
                                    {(filter == 'emptyForLoading_on_way' || filter == 'emptyOther_on_way') &&
                                        (paginatedData as any[]).map((trip: any, index: number) =>
                                            <TableRow key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                                                <TableCell>
                                                    <img
                                                        src={trip?.LoadStatus === 1 ? "/icons/newThemeIcons/loaded-vehicles.svg" : "/icons/newThemeIcons/empty-vehicles.svg"}
                                                        alt={trip?.LoadStatus === 1 ? "Loaded" : "Empty"}
                                                        className="w-8 h-8 object-contain"
                                                    />
                                                </TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.StartFrom.split(':')[1] || trip?.StartFrom || "")}</TableCell>}
                                                {user?.Division.includes('Admin') && <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo.split(':')[1] || trip?.EndTo || "")}</TableCell>
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
                                                    {trip?.superwiser && user?.Division.includes('Admin') &&
                                                        <AdminLoadingPlanner trip={trip} manager={trip.superwiser} trigger="Divert" type="divert"></AdminLoadingPlanner>
                                                    }
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
                                    {(filter == 'emptyForLoading_outside_standing' || filter == 'emptyForLoading_factory_in' || filter == 'underMaintenance_outside_standing' || filter == 'underMaintenance_factory_in') &&
                                        (paginatedData as any[]).map((trip: any, index: number) =>
                                            <TableRow key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                                                <TableCell>
                                                    <img
                                                        src={trip?.LoadStatus === 1 ? "/icons/newThemeIcons/loaded-vehicles.svg" : "/icons/newThemeIcons/empty-vehicles.svg"}
                                                        alt={trip?.LoadStatus === 1 ? "Loaded" : "Empty"}
                                                        className="w-8 h-8 object-contain"
                                                    />
                                                </TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.StartFrom.split(':')[1] || trip?.StartFrom || "")}</TableCell>}
                                                {user?.Division.includes('Admin') && <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>}
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo.split(':')[1] || trip?.EndTo || "")}</TableCell>
                                                <TableCell>{highlightText(trip?.loadingSuperVisor || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.EmptyTripDetail?.ReportDate)}</TableCell>
                                                <TableCell>{trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status !== "Custom" ? trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status + `: ${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment || ""}` : trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.comment}</TableCell>
                                                <TableCell className='flex gap-2'>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                Update
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className='dropdown'>
                                                            {tripStatusUpdateVars.filter((option) => !["In Depot", "Loaded"].includes(option)).map((statupOpetion) => (
                                                                <DropdownMenuItem key={statupOpetion} onClick={() => setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums })}>
                                                                    {statupOpetion}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuItem>
                                                                <Link href={{
                                                                    pathname: "trans-app/loading-tracker",
                                                                    query: {
                                                                        tripId: trip?._id,
                                                                        actionType: "loaded"
                                                                    }
                                                                }}>Loaded</Link>
                                                            </DropdownMenuItem>
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
                                                                    pathname: "trans-app/loading-planner",
                                                                    query: {
                                                                        tripId: trip?._id
                                                                    }
                                                                }}>Give Plan</Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    {trip?.superwiser && user?.Division.includes('Admin') &&
                                                        <AdminLoadingPlanner trip={trip} manager={trip.superwiser} trigger="Order" type="divert"></AdminLoadingPlanner>
                                                    }
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
                                    {(filter == 'emptyOther_standing' || filter == 'emptyOther_other_standing' || filter == 'emptyOther_depot_standing' || filter.startsWith('underMaintenance')) &&
                                        (paginatedData as any[]).map((trip: any, index: number) =>
                                            <TableRow key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                                                <TableCell>
                                                    <img
                                                        src={trip?.LoadStatus === 1 ? "/icons/newThemeIcons/loaded-vehicles.svg" : "/icons/newThemeIcons/empty-vehicles.svg"}
                                                        alt={trip?.LoadStatus === 1 ? "Loaded" : "Empty"}
                                                        className="w-8 h-8 object-contain"
                                                    />
                                                </TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.StartFrom.split(':')[1] || trip?.StartFrom || "")}</TableCell>}
                                                {user?.Division.includes('Admin') && <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>}
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo.split(':')[1] || trip?.EndTo || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.EmptyTripDetail?.ReportDate)}</TableCell>
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
                                                            <DropdownMenuItem>
                                                                <Link href={{
                                                                    pathname: "trans-app/loading-planner",
                                                                    query: {
                                                                        tripId: trip?._id
                                                                    }
                                                                }}>Give Plan</Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    {trip?.superwiser && user?.Division.includes('Admin') &&
                                                        <AdminLoadingPlanner trip={trip} manager={trip.superwiser} trigger="Order" type="divert"></AdminLoadingPlanner>
                                                    }
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
                                        (paginatedData as any[]).map((trip: any, index: number) =>
                                            <TableRow key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                                                <TableCell>
                                                    <img
                                                        src={trip?.LoadStatus === 1 ? "/icons/newThemeIcons/loaded-vehicles.svg" : "/icons/newThemeIcons/empty-vehicles.svg"}
                                                        alt={trip?.LoadStatus === 1 ? "Loaded" : "Empty"}
                                                        className="w-8 h-8 object-contain"
                                                    />
                                                </TableCell>
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.superwiser || "")}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo.split(':')[1] || trip?.EndTo || "")}</TableCell>
                                                <TableCell>{highlightText(trip?.loadingSuperVisor || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.EmptyTripDetail?.ReportDate)}</TableCell>
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
                                    {filter == 'emptyForLoading_reported' &&
                                        (paginatedData as any[]).map((trip: any, index: number) =>
                                            <TableRow key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                                                <TableCell>
                                                    <img
                                                        src={trip?.LoadStatus === 1 ? "/icons/newThemeIcons/loaded-vehicles.svg" : "/icons/newThemeIcons/empty-vehicles.svg"}
                                                        alt={trip?.LoadStatus === 1 ? "Loaded" : "Empty"}
                                                        className="w-8 h-8 object-contain"
                                                    />
                                                </TableCell>
                                                {user?.Division.includes('Admin') && <TableCell>{highlightText(trip?.StartFrom.split(':')[1] || trip?.StartFrom || "")}</TableCell>}
                                                {user?.Division.includes('Admin') && <TableCell>{formatDate(trip?.StartDate).split(',')[0]}</TableCell>}
                                                <TableCell>{highlightText(trip?.EndTo.split(':')[1] || trip?.EndTo.split(':')[1] || trip?.EndTo || "")}</TableCell>
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                <TableCell>{trip?.TravelHistory?.[trip?.TravelHistory?.length - 1]?.LocationOnTrackUpdate}</TableCell>
                                                <TableCell>{highlightText(trip?.loadingSuperVisor || "")}</TableCell>
                                                <TableCell>{formatDate(trip?.EmptyTripDetail?.ReportDate)}</TableCell>
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
                                                    {trip?.superwiser && user?.Division.includes('Admin') &&
                                                        <AdminLoadingPlanner trip={trip} manager={trip.superwiser} trigger="Divert" type="divert"></AdminLoadingPlanner>
                                                    }
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
                                    {(filter == 'emptyForLoading_depo_standing' || filter == 'emptyOther_loaded') &&
                                        (paginatedData as any[]).map((trip: any, index: number) =>
                                            <TableRow key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                                                <TableCell>
                                                    <img
                                                        src={trip?.LoadStatus === 1 ? "/icons/newThemeIcons/loaded-vehicles.svg" : "/icons/newThemeIcons/empty-vehicles.svg"}
                                                        alt={trip?.LoadStatus === 1 ? "Loaded" : "Empty"}
                                                        className="w-8 h-8 object-contain"
                                                    />
                                                </TableCell>
                                                <TableCell>{highlightText(trip?.VehicleNo || "")}</TableCell>
                                                <TableCell>{trip?.EndTo.split(':')[1] || trip?.EndTo}</TableCell>
                                                <TableCell>{formatDate(trip?.StartDate)?.split(',')[0]}</TableCell>
                                                <TableCell>{trip?.capacity}</TableCell>
                                                <TableCell>{highlightText(trip?.StartFrom.split(':')[1] || trip?.StartFrom || "")}</TableCell>
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
                                                    {filter !== 'emptyOther_loaded' && (
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
                                                                    }}>Give Plan</Link>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                    {filter !== 'emptyOther_loaded' && trip?.superwiser && user?.Division.includes('Admin') &&
                                                        <AdminLoadingPlanner trip={trip} manager={trip.superwiser} trigger="Order" type="new"></AdminLoadingPlanner>
                                                    }
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
                        </div>
                    }

                    {/* Pagination Controls */}
                    {filter !== 'all' && totalPages > 0 && (
                        <div className="items-center justify-between px-4 py-3 border-t hidden md:flex">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>
                                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalRecords)} of {totalRecords} records
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">Records per page:</span>
                                    <Select
                                        value={pageSize.toString()}
                                        onValueChange={(value) => {
                                            setPageSize(Number(value));
                                            setPage(1); // Reset to first page when changing page size
                                        }}
                                    >
                                        <SelectTrigger className="w-20 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                            <SelectItem value="100">100</SelectItem>
                                            <SelectItem value="200">200</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                >
                                    First
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(prev => Math.max(1, (prev as number) - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={page === pageNum ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setPage(pageNum)}
                                                className="w-10"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(prev => Math.min(totalPages, (prev as number) + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(totalPages)}
                                    disabled={page === totalPages}
                                >
                                    Last
                                </Button>
                            </div>
                        </div>
                    )}

                    {filter === "all" &&
                        <div className='my-4'>
                            <Accordion value={allVehiclesAccordion} onValueChange={setAllVehiclesAccordion} type="single" collapsible className="mb-2 p-4 w-full">
                                {/* Loaded Vehicles */}
                                <AccordionItem value="loaded">
                                    <AccordionTrigger className="text-lg font-semibold">Loaded Vehicles</AccordionTrigger>
                                    <AccordionContent>
                                        {(Object.entries(groupedLoadedByEndTo) as [string, GroupedTrip[]][]).map(([endTo, trips]) => (
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
                                                            {trips.sort((a: any, b: any) => (a.status as string).localeCompare(b.status as string)).map((trip: any) => (
                                                                <TableRow onClick={(e: React.MouseEvent) => {
                                                                    const el = e.target as HTMLElement | null;
                                                                    // if the click happened inside the dropdown, don't open the drawer
                                                                    if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link') && !el.closest('#adminorder')) {
                                                                        setViewingTrip(trip?._id)
                                                                    }
                                                                }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
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
                                                                                {tripStatusUpdateVars.map((statupOpetion: string) => (
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
                                        {(Object.entries(groupedEmptyByEndTo) as [string, GroupedTrip[]][]).map(([endTo, trips]) => (
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
                                                            {trips.sort((a: any, b: any) => (a.status as string).localeCompare(b.status as string)).map((trip: any) => (
                                                                <TableRow onClick={(e: React.MouseEvent) => {
                                                                    const el = e.target as HTMLElement | null;
                                                                    // if the click happened inside the dropdown, don't open the drawer
                                                                    if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link') && !el.closest('#adminorder')) {
                                                                        setViewingTrip(trip?._id)
                                                                    }
                                                                }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
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
                                                                                {tripStatusUpdateVars.map((statupOpetion: string) => (
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
                                {user?.Division?.includes('Admin') &&
                                    <AccordionItem value="supervisors">
                                        <AccordionTrigger className="text-lg font-semibold">Supervisor Wise Data</AccordionTrigger>
                                        <AccordionContent>
                                            <div className='text-center font-semibold text-lg'>Empty Vehicles</div>
                                            {(Object.entries(groupedEmptyBySupervisor) as [string, GroupedTrip[]][]).map(([endTo, trips]) => (
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
                                                                {trips.sort((a: any, b: any) => (a.status as string).localeCompare(b.status as string)).map((trip: any, index: number) => (
                                                                    <TableRow onClick={(e: React.MouseEvent) => {
                                                                        const el = e.target as HTMLElement | null;
                                                                        // if the click happened inside the dropdown, don't open the drawer
                                                                        if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link') && !el.closest('#adminorder')) {
                                                                            setViewingTrip(trip?._id)
                                                                        }
                                                                    }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
                                                                        <TableCell>{index + 1}</TableCell>
                                                                        <TableCell>{trip?.VehicleNo}</TableCell>
                                                                        <TableCell>{trip?.capacity}</TableCell>
                                                                        {user?.Division.includes('Admin') && <TableCell>{trip?.superwiser}</TableCell>}
                                                                        <TableCell>{trip?.EndTo.split(':')[1] || trip?.EndTo}</TableCell>
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
                                                                                    {tripStatusUpdateVars.map((statupOpetion: string) => (
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
                                            {(Object.entries(groupedLoadedBySupervisor) as [string, GroupedTrip[]][]).map(([endTo, trips]) => (
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
                                                                {trips.sort((a: any, b: any) => (a.status as string).localeCompare(b.status as string)).map((trip: any, index: number) => (
                                                                    <TableRow onClick={(e: React.MouseEvent) => {
                                                                        const el = e.target as HTMLElement | null;
                                                                        // if the click happened inside the dropdown, don't open the drawer
                                                                        if (!el?.closest || !el.closest('.dropdown') && !el.closest('.link') && !el.closest('#adminorder')) {
                                                                            setViewingTrip(trip?._id)
                                                                        }
                                                                    }} key={trip?._id} className={`${trip?.statusUpdate?.[trip?.statusUpdate?.length - 1]?.status === "Accident" ? "bg-orange-300" : ""} ${trip?.driverStatus === 0 ? "text-destructive" : ""}`}>
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
                                                                                    {tripStatusUpdateVars.map((statupOpetion: string) => (
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
                        </div>
                    }
                </>
            }
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

            {/* Image Preview Dialog */}
            <Dialog open={Boolean(imagePreview)} onOpenChange={(open) => {
                if (!open && imagePreview) {
                    URL.revokeObjectURL(imagePreview.url);
                    setImagePreview(null);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Report Preview</DialogTitle>
                        <DialogDescription>
                            Preview your generated report. You can share or download it below.
                        </DialogDescription>
                    </DialogHeader>

                    {imagePreview && (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="border rounded-lg overflow-hidden shadow-lg max-w-full">
                                <img
                                    src={imagePreview.url}
                                    alt="Report Preview"
                                    className="w-full h-auto"
                                    style={{ maxHeight: '60vh', objectFit: 'contain' }}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex justify-between sm:justify-between gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (imagePreview) {
                                    URL.revokeObjectURL(imagePreview.url);
                                    setImagePreview(null);
                                }
                            }}
                        >
                            Close
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (!imagePreview) return;
                                    const link = document.createElement('a');
                                    link.href = imagePreview.url;
                                    link.download = imagePreview.filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    toast.success('Report downloaded successfully!');
                                }}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (!imagePreview) return;
                                    try {
                                        const file = new File([imagePreview.blob], imagePreview.filename, { type: 'image/png' });
                                        const nav: any = typeof navigator !== "undefined" ? navigator : undefined;

                                        if (nav && typeof nav.share === "function") {
                                            await nav.share({
                                                files: [file],
                                                title: `${camelToWords(filter)} - Vehicles Report`,
                                                text: `Sharing ${camelToWords(filter)} report`,
                                            });
                                            toast.success('Report shared successfully!');
                                        } else {
                                            toast.error('Sharing is not supported on this device');
                                        }
                                    } catch (error: any) {
                                        if (error.name !== 'AbortError') {
                                            console.error('Share failed:', error);
                                            toast.error('Failed to share report', { description: String(error) });
                                        }
                                    }
                                }}
                            >
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {viewingTrip !== null &&
                <CustomDrawer key={viewingTrip} title={tripForDrawer?.VehicleNo || ""} description={viewingTrip || ""}>
                    <div className="max-h-[60svh] overflow-y-auto">
                        <div className='flex flex-col gap-1 mb-4'>
                            <div className='flex gap-2'>
                                <strong>Route: </strong> {tripForDrawer?.StartFrom} to {tripForDrawer?.EndTo}
                            </div>
                            <div className='flex gap-2'>
                                <strong>Started at: </strong> {formatDate(tripForDrawer?.StartDate)?.split(",")[0]} <span className={tripForDrawer?.LoadStatus === 0 ? "text-red-500" : "text-green-500"}>{tripForDrawer?.LoadStatus === 0 ? "Empty" : "Loaded"}</span>
                            </div>
                            <div className='flex gap-2'>
                                <strong>Start Driver: </strong> {tripForDrawer?.StartDriver}
                            </div>
                            {tripForDrawer?.TallyLoadDetail && <>
                                <div className='flex gap-2'>
                                    <strong>Start Odometer: </strong> {tripForDrawer?.TallyLoadDetail.StartOdometer}
                                </div>
                                <div className='flex gap-2'>
                                    <strong>Product: </strong> {tripForDrawer?.TallyLoadDetail.Goods}
                                </div>
                            </>}
                            {tripForDrawer?.ReportingDate && <div className='flex gap-2'>
                                <strong>Reported at: </strong> {formatDate(tripForDrawer?.ReportingDate)}
                            </div>}
                        </div>
                        {tripForDrawer?.TravelHistory &&
                            <>
                                <h4 className='font-semibold mt-4 mb-2'>Travel History</h4>
                                <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
                                    {[...(tripForDrawer.TravelHistory as any[])]
                                        .sort((a: any, b: any) => new Date(a.TrackUpdateDate).getTime() - new Date(b.TrackUpdateDate).getTime())
                                        .map((history: any, index: number) => (
                                            <Card key={index}>
                                                <CardHeader>
                                                    <CardTitle className="text-md font-semibold">{((history?.ManagerComment?.match(/#(\w+)/) || [])[1] || "Update") + " marked on " + formatDate(history?.TrackUpdateDate)}</CardTitle>
                                                    <CardDescription>
                                                        {history?.LocationOnTrackUpdate && <div><strong>Location on Track Update:</strong> {history.LocationOnTrackUpdate}</div>}
                                                        {typeof history?.OdometerOnTrackUpdate === "number" && <div><strong>Odometer:</strong> {history.OdometerOnTrackUpdate} km</div>}
                                                        {history?.ManagerComment && <div><strong>Manager Comment:</strong> {history.ManagerComment}</div>}
                                                        {history?.Driver && <div><strong>Driver:</strong> {history.Driver}</div>}
                                                    </CardDescription>
                                                </CardHeader>
                                            </Card>
                                        ))
                                    }
                                </div>
                            </>
                        }
                        {tripForDrawer?.statusUpdate &&
                            <>
                                <h4 className='font-semibold mt-4 mb-2'>Status Updates</h4>
                                <div className='grid grid-cols-1 md:grid-cols-4 gap-2'>
                                    {[...(tripForDrawer.statusUpdate as any[])]
                                        .sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                                        .map((history: any, index: number) => (
                                            <Card key={index}>
                                                <CardHeader>
                                                    <CardTitle className="text-md font-semibold">{formatDate(history.dateTime)}</CardTitle>
                                                    <CardDescription className='text-card-foreground'>
                                                        {history?.status && <div><strong>Status:</strong> {history.status}</div>}
                                                        {history?.comment && <div><strong>Comment:</strong> {history.comment}</div>}
                                                    </CardDescription>
                                                    <CardFooter className='text-muted-foreground p-0'>by: {history?.user?.name}</CardFooter>
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

export default VehiclesSummaryOptimized
