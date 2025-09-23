"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Ban, Filter } from "lucide-react";

import { DetailedVehicleData, InactiveVehicles, TransAppUser } from "@/types";
import { useVehiclesCache } from "@/src/context/VehiclesCacheContext";
import { BASE_URL } from "@/lib/api";
import { fetchUserVehicles } from "@/utils/transApp";
import DriverManagementModal from "../DriverManagement";
import { formatDate } from "@/lib/utils";
import UpdateTripMenu from "./UpdateTripMenu";
import { Input } from "@/components/ui/input";

const VehicleManagement = ({ user }: { user: TransAppUser | undefined }) => {
    const { cache, setCache } = useVehiclesCache();
    const [vehicles, setVehicles] = useState<DetailedVehicleData[]>([]);
    const [inactiveVehicles, setInactiveVehicles] = useState<InactiveVehicles[]>([]);
    const [filterNoDriver, setFilterNoDriver] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const pageSize = 20;

    // Derive a human-readable trip status based on business rules provided
    const computeTripStatus = (trip: DetailedVehicleData["latestTrip"] | undefined): string => {
        if (!trip) return "—";

        // Base by LoadStatus (0 -> Empty, else Loaded)
        const isEmpty = Number(trip.LoadStatus) === 0;

        // Consider different sources for reporting/unloading
        const hasReported = Boolean(
            trip.ReportingDate || trip.LoadTripDetail?.ReportDate || trip.EmptyTripDetail?.ReportDate
        );
        const hasUnloaded = Boolean(
            trip.LoadTripDetail?.UnloadDate
        );

        // Derive base status first
        let base = "";
        if (hasUnloaded) base = "Unloaded - Not Planned";
        else if (hasReported) base = isEmpty ? "Empty Reported" : "Loaded Reported";
        else base = isEmpty ? "Empty On Way" : "Loaded On Way";

        // Override with statusUpdate, unless it's Custom
        // const lastSU = trip.statusUpdate?.[trip.statusUpdate.length - 1];
        // if (lastSU?.status && lastSU.status !== "Custom") {
        //     return lastSU.status === "Loaded" ? "Loaded" : lastSU.status;
        // }

        return base;
    };

    useEffect(() => {
        if (vehicles.length > 0) {
            console.log('Vehicles state updated:', vehicles);
        }
    }, [vehicles])

    useEffect(() => {
        if (!user?._id) return;

        if (cache.vehicleDetails && Object.keys(cache.vehicleDetails).length > 0) {
            setVehicles(Object.values(cache.vehicleDetails));
            return;
        }

        // Otherwise fetch and update cache
        fetchUserVehicles(user._id, user?.Division?.includes('Admin') || false)
            .then((data) => {
                setVehicles(data);
                setCache((prev) => ({
                    ...prev,
                    vehicleDetails: Object.fromEntries(data.map((v) => [v.vehicle?._id, v]))
                }));
            })
            .catch((err) => {
                console.error(err);
                toast.error("Failed to load vehicles", { description: String(err) });
            });
    }, [user?._id]);

    useEffect(() => {
        if (cache.vehicleDetails) {
            setVehicles(Object.values(cache.vehicleDetails));
        }
    }, [cache.vehicleDetails]);

    const deleteVehicle = async (vehicleNo: string) => {
        let confirmation = confirm(`Do you want to delete the vehicle ${vehicleNo}?`);
        if (!confirmation) return;

        try {
            const res = await fetch(`${BASE_URL}/trans-app/manage-profile/delete-vehicle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vehicleNo, userName: user?.name }),
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error("Error in request", { description: data.error, richColors: true });
                return;
            }

            toast.success(data.message, {
                description: `${vehicleNo} has been deleted.`, richColors: true
            });

            setVehicles((prev) => prev.filter((v) => v.vehicle?.VehicleNo !== vehicleNo));
        } catch (error) {
            console.error(error);
            toast.error("An error occurred", { description: String(error), richColors: true });
        }
    };

    const deActivateVehicle = async (vehicleNo: string) => {
        let confirmation = confirm(`Do you want to deactivate the vehicle ${vehicleNo}?`);
        if (!confirmation) return;

        try {
            const res = await fetch(`${BASE_URL}/trans-app/manage-profile/deactivate-vehicle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vehicleNo, userName: user?.name }),
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error("Error in request", { description: data.error, richColors: true });
                return;
            }

            toast.success(data.message, {
                description: `${vehicleNo} has been marked as inactive.`, richColors: true
            });

            fetchInactiveVehicles();
        } catch (error) {
            console.error(error);
            toast.error("An error occurred", { description: String(error), richColors: true });
        }
    };

    const fetchInactiveVehicles = async () => {
        try {
            const res = await fetch(`${BASE_URL}/trans-app/manage-profile/inactive-vehicles/${user?._id}`);
            const data = await res.json();

            if (res.ok) {
                setInactiveVehicles(data.deactivatedVehiclesList);
            } else {
                toast.warning(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch inactive vehicle, richColors:trues");
        }
    };

    // Memoized derived values for performance on large datasets
    const hasAnyNoDriver = useMemo(() =>
        vehicles.some(v => v.vehicle?.tripDetails?.driver === "no driver" || v?.driver.name === "no driver"),
        [vehicles]
    );

    const filteredVehicles = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch = (v: DetailedVehicleData) => {
            if (!q) return true;
            const vehicleNo = v.vehicle?.VehicleNo?.toString()?.toLowerCase() || "";
            const capacity = (v.vehicle?.capacity ?? "")?.toString()?.toLowerCase();
            const driverName = v?.driver?.name?.toString()?.toLowerCase() || "";
            // Access potential driver mobile fields safely using any to avoid type issues
            const anyV = v as any;
            const driverMobile = (
                anyV?.driver?.mobile ||
                anyV?.driver?.mobileNo ||
                anyV?.driver?.mobile_number ||
                anyV?.driver?.phone ||
                anyV?.driver?.contactNo ||
                anyV?.driver?.contact
            );
            const driverMobileStr = driverMobile ? String(driverMobile).toLowerCase() : "";
            const supervisor = (v as any)?.superwiser?.toString()?.toLowerCase() || "";

            return (
                vehicleNo.includes(q) ||
                driverName.includes(q) ||
                driverMobileStr.includes(q) ||
                capacity.includes(q) ||
                supervisor.includes(q)
            );
        };

        const list = vehicles.filter((v) => {
            const noDriver = v.vehicle?.tripDetails?.driver === "no driver" || v?.driver.name === "no driver";
            const passesNoDriver = filterNoDriver ? noDriver : true;
            return passesNoDriver && matchesSearch(v);
        });
        return list;
    }, [vehicles, filterNoDriver, searchQuery]);

    const inactiveSet = useMemo(() => new Set(inactiveVehicles.map(i => i.VehicleNo)), [inactiveVehicles]);

    // Pagination over filtered data (apply filters globally, show only current page)
    const total = filteredVehicles.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // Keep current page within bounds when filters/search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterNoDriver]);
    useEffect(() => {
        setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
    }, [totalPages]);
    const pageStart = (currentPage - 1) * pageSize;
    const pageEnd = Math.min(total, pageStart + pageSize);
    const pageVehicles = useMemo(() => filteredVehicles.slice(pageStart, pageEnd), [filteredVehicles, pageStart, pageEnd]);

    // column span for spacer rows
    const colSpan = useMemo(() => {
        let count = 0;
        // Sn, Vehicle no., Capacity, Driver
        count += 4;
        if (hasAnyNoDriver) count += 2; // No Driver Since, Location
        // Trip Status, Last Update IN, Last Status Comment, Last Comment Time
        // When filterNoDriver is active, hide Trip Status, Last Update IN, Last Comment Time (keep Last Status Comment)
        count += filterNoDriver ? 1 /* only Last Status Comment */ : 4;
        if (user?.Division?.includes('Admin')) count += 1; // Supervisor
        // Actions
        count += filterNoDriver ? 0 : 1;
        return count;
    }, [hasAnyNoDriver, user?.Division, filterNoDriver]);

    return (
        <>
            <div className="flex items-center gap-3 flex-wrap mb-2">
                <Button className="w-max" size="sm" onClick={() => setFilterNoDriver(filterNoDriver ? false : true)} aria-pressed={filterNoDriver} variant={filterNoDriver ? "secondary" : "default"}>
                    No Driver
                    <Filter size={16} className="ml-1" />
                </Button>
                <div className="flex-1 min-w-[240px] max-w-md">
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by Vehicle No, Driver, Mobile, Capacity, Supervisor"
                        aria-label="Search vehicles"
                    />
                </div>
            </div>
            <div className="relative w-full overflow-auto" style={{ maxHeight: '70svh' }}>
                <Table className='w-full min-w-max'>
                    <TableHeader>
                        <TableRow className="sticky top-0 bg-background z-10">
                            <TableHead className="bg-background">Sn</TableHead>
                            <TableHead className="bg-background">Vehicle no.</TableHead>
                            <TableHead className="bg-background">Capacity</TableHead>
                            <TableHead className="bg-background flex flex-row gap-3 items-center">Driver</TableHead>
                            {hasAnyNoDriver && (
                                <>
                                    <TableHead className="bg-background">No Driver Since</TableHead>
                                    <TableHead className="bg-background">Location</TableHead>
                                </>
                            )}
                            {!filterNoDriver && (
                                <>
                                    <TableHead className="bg-background">Trip Status</TableHead>
                                    <TableHead className="bg-background">Last Update IN</TableHead>
                                </>
                            )}
                            <TableHead className="bg-background">Last Status Comment</TableHead>
                            {!filterNoDriver && (
                                <TableHead className="bg-background">Last Comment Time</TableHead>
                            )}
                            {user?.Division?.includes('Admin') && (
                                <TableHead className="bg-background">Supervisor</TableHead>
                            )}
                            {!filterNoDriver && (
                                <TableHead className="bg-background">Actions</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pageVehicles?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={999} className="text-center text-muted-foreground">No records found</TableCell>
                            </TableRow>
                        )}
                        {pageVehicles?.map((v, index) => {
                            const VehicleNo = v?.vehicle?.VehicleNo ?? "-";
                            const isInactive = inactiveSet.has(VehicleNo);
                            const noDriverRow = v?.vehicle?.tripDetails?.driver === "no driver" || v?.driver?.name === "no driver";

                            let rowClass = "";
                            if (isInactive) rowClass += " bg-red-300";
                            if (noDriverRow) rowClass += " text-destructive";

                            const q = searchQuery.trim();
                            const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                            const highlight = (value: string | number | undefined) => {
                                if (!q || value === undefined || value === null) return value ?? '—';
                                const str = String(value);
                                try {
                                    const regex = new RegExp(`(${escapeRegExp(q)})`, 'ig');
                                    const parts = str.split(regex);
                                    return parts.map((part, i) => (
                                        i % 2 === 1
                                            ? <span key={i} className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">{part}</span>
                                            : <React.Fragment key={i}>{part}</React.Fragment>
                                    ));
                                } catch {
                                    return str;
                                }
                            };

                            return (
                                <TableRow key={v?.vehicle?._id ?? `${VehicleNo}-${pageStart + index}`} className={rowClass.trim()}>
                                    <TableCell>{pageStart + index + 1}</TableCell>
                                    <TableCell>{highlight(VehicleNo)}</TableCell>
                                    <TableCell>{highlight(v?.vehicle?.capacity ?? "—")}</TableCell>
                                    {/* Show driver name if available, else tripDetails driver (e.g., NO DRIVER). Also show mobile if present. */}
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{
                                                v?.vehicle?.tripDetails?.driver === "no driver"
                                                    ? highlight(v?.vehicle?.tripDetails?.driver?.toUpperCase())
                                                    : highlight(v?.driver?.name || v?.vehicle?.tripDetails?.driver)
                                            }</span>
                                            {(() => {
                                                const anyV = v as any;
                                                const mobile = v?.driver?.mobile || anyV?.driver?.mobileNo || anyV?.driver?.mobile_number || anyV?.driver?.phone || anyV?.driver?.contactNo || anyV?.driver?.contact;
                                                if (!mobile) return null;
                                                return v?.vehicle?.tripDetails?.driver !== "no driver" && <span className="text-xs text-muted-foreground">{highlight(String(mobile))}</span>;
                                            })()}
                                        </div>
                                    </TableCell>
                                    {hasAnyNoDriver && (
                                        <>
                                            <TableCell>
                                                {v?.driver?.leaving?.from
                                                    ? `${Math.round(
                                                        Math.abs(
                                                            Number(new Date()) - Number(new Date(v?.driver?.leaving?.from))
                                                        ) / (1000 * 60 * 60 * 24)
                                                    )} Days`
                                                    : ""}
                                            </TableCell>
                                            <TableCell>{v?.driver?.leaving?.location}</TableCell>
                                        </>
                                    )}
                                    {!filterNoDriver && (
                                        <>
                                            <TableCell>
                                                {computeTripStatus(v?.latestTrip)}
                                            </TableCell>
                                            <TableCell>{v?.lastStatusUpdate?.source || '_'}</TableCell>
                                        </>
                                    )}
                                    <TableCell>{filterNoDriver ? v?.lastDriverLog?.leaving?.remark : v?.lastStatusUpdate?.comment || v?.lastDriverLog?.statusUpdate?.[v?.lastDriverLog?.statusUpdate?.length - 1]?.remark || v?.lastDriverLog?.leaving?.remark}</TableCell>
                                    {!filterNoDriver && (
                                        <TableCell>{formatDate(v?.lastStatusUpdate?.dateTime!) || formatDate(v?.lastDriverLog?.statusUpdate?.[v?.lastDriverLog?.statusUpdate?.length - 1]?.dateTime)}</TableCell>
                                    )}
                                    {user?.Division?.includes('Admin') && (
                                        <TableCell>
                                            {highlight((v as any)?.superwiser || '-')}
                                        </TableCell>
                                    )}
                                    {!filterNoDriver && (
                                        <TableCell>
                                            <div className="flex gap-2 items-center">
                                                {!user?.Division?.includes('Admin') && (
                                                    <>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        onClick={() => deleteVehicle(VehicleNo)}
                                                                        variant="destructive"
                                                                        size="icon"
                                                                    >
                                                                        <Trash2 />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Delete Vehicle</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        {!isInactive && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            onClick={() => deActivateVehicle(VehicleNo)}
                                                                            variant="secondary"
                                                                            size="icon"
                                                                        >
                                                                            <Ban />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Mark Inactive</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}

                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <DriverManagementModal vehicle={v} />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Manage Driver</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </>
                                                )}

                                                {/* Update menu per row */}
                                                <UpdateTripMenu
                                                    trip={v?.latestTrip}
                                                    vehicleNo={VehicleNo}
                                                    user={user}
                                                    statusLabel={computeTripStatus(v?.latestTrip)}
                                                />
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            {/* Pagination footer */}
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                    {total > 0
                        ? `Showing ${pageStart + 1}-${pageEnd} of ${total} records`
                        : 'No records'}
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                        First
                    </Button>
                    <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                        Prev
                    </Button>
                    {/* Simple numeric window around current page */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Center current page if possible
                        const half = Math.floor(5 / 2);
                        let start = Math.max(1, Math.min(totalPages - 4, currentPage - half));
                        if (totalPages <= 5) start = 1;
                        const page = start + i;
                        if (page > totalPages) return null;
                        const active = page === currentPage;
                        return (
                            <Button
                                key={page}
                                size="sm"
                                variant={active ? "default" : "outline"}
                                onClick={() => setCurrentPage(page)}
                                aria-current={active ? 'page' : undefined}
                            >
                                {page}
                            </Button>
                        );
                    })}
                    <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                        Next
                    </Button>
                    <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                        Last
                    </Button>
                    <div className="ml-2 text-sm text-muted-foreground">Page {currentPage} of {totalPages}</div>
                </div>
            </div>
        </>
    );
};

export default VehicleManagement;
