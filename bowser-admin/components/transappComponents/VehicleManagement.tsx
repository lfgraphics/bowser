"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    ExcelTable as Table,
    ExcelTableBody as TableBody,
    ExcelTableCell as TableCell,
    ExcelTableHead as TableHead,
    ExcelTableHeader as TableHeader,
    ExcelTableRow as TableRow
} from "@codvista/cvians-excel-table"
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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const VehicleManagement = ({ user }: { user: TransAppUser | undefined }) => {
    const { cache, setCache } = useVehiclesCache();
    const [vehicles, setVehicles] = useState<DetailedVehicleData[]>([]);
    const [inactiveVehicles, setInactiveVehicles] = useState<InactiveVehicles[]>([]);
    const [filterNoDriver, setFilterNoDriver] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(30);

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

        // Override with statusUpdate, unless it's Custom (kept disabled as before)
        // const lastSU = trip.statusUpdate?.[trip.statusUpdate.length - 1];
        // if (lastSU?.status && lastSU.status !== "Custom") {
        //     return lastSU.status === "Loaded" ? "Loaded" : lastSU.status;
        // }

        return base;
    };

    // Log vehicle state updates (non-blocking)
    useEffect(() => {
        if (vehicles.length > 0) {
            console.log('Vehicles state updated:', vehicles);
        }
    }, [vehicles]);

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
                    vehicleDetails: Object.fromEntries(data.map((v) => [v?.vehicle?._id, v]))
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

            setVehicles((prev) => prev?.filter((v) => v?.vehicle?.VehicleNo !== vehicleNo));
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
        vehicles.some(v => v?.vehicle?.tripDetails?.driver === "no driver" || v?.driver?.name === "no driver"),
        [vehicles]
    );

    const filteredVehicles = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch = (v: DetailedVehicleData) => {
            if (!q) return true;
            const vehicleNo = v?.vehicle?.VehicleNo?.toString()?.toLowerCase() || "";
            const capacity = (v?.vehicle?.capacity ?? "")?.toString()?.toLowerCase();
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
            const noDriver = v?.vehicle?.tripDetails?.driver === "no driver" || v?.driver?.name === "no driver";
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

    // (virtualization removed) no need for dynamic column span now

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
                            <TableHead sortable dataType="number" className="bg-background">Sn</TableHead>
                            <TableHead sortable dataType="string" filterable className="bg-background">Vehicle no.</TableHead>
                            <TableHead sortable dataType="number" filterable className="bg-background">Capacity</TableHead>
                            <TableHead sortable dataType="string" filterable className="bg-background flex flex-row gap-3 items-center">Driver</TableHead>
                            {hasAnyNoDriver && (
                                <>
                                    <TableHead sortable dataType="number" filterable className="bg-background">No Driver Since</TableHead>
                                    <TableHead sortable dataType="string" filterable className="bg-background">Location</TableHead>
                                </>
                            )}
                            <TableHead sortable dataType="string" filterable className="bg-background">Trip Status</TableHead>
                            {!filterNoDriver && (
                                <>
                                    <TableHead sortable dataType="string" filterable className="bg-background">Last Update IN</TableHead>
                                </>
                            )}
                            <TableHead sortable dataType="string" filterable className="bg-background">Last Status Comment</TableHead>
                            {!filterNoDriver && (
                                <TableHead sortable dataType="string" filterable className="bg-background">Last Comment Time</TableHead>
                            )}
                            {user?.Division?.includes('Admin') && (
                                <TableHead sortable dataType="string" filterable className="bg-background">Supervisor</TableHead>
                            )}
                            {!filterNoDriver && (
                                <TableHead className="bg-background">Actions</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pageVehicles?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground">No records found</TableCell>
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
                                    <TableCell>{computeTripStatus(v?.latestTrip)}</TableCell>
                                    {!filterNoDriver && (
                                        <>
                                            <TableCell>{v?.lastStatusUpdate?.source || '_'}</TableCell>
                                        </>
                                    )}
                                    <TableCell>
                                        {v.lastStatusUpdate?.comment || '_'}
                                    </TableCell>
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
            <div className="mt-3 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                    {total > 0
                        ? `Showing ${pageStart + 1}-${pageEnd} of ${total} records`
                        : 'No records'}
                </div>
                <Pagination className="sm:justify-end w-full sm:w-auto">
                    <PaginationContent>

                        {/* Prev */}
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage((p) => Math.max(1, p - 1)); }}
                                aria-disabled={currentPage === 1}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                            />
                        </PaginationItem>

                        {/* Pages window with ellipses */}
                        {(() => {
                            const items: React.ReactNode[] = [];
                            const maxButtons = 5;
                            let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                            let end = start + maxButtons - 1;
                            if (end > totalPages) {
                                end = totalPages;
                                start = Math.max(1, end - maxButtons + 1);
                            }
                            // Leading first page + ellipsis
                            if (start > 1) {
                                items.push(
                                    <PaginationItem key={1}>
                                        <PaginationLink
                                            href="#"
                                            isActive={currentPage === 1}
                                            onClick={(e) => { e.preventDefault(); setCurrentPage(1); }}
                                        >
                                            1
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                                if (start > 2) items.push(<PaginationEllipsis key="start-ellipsis" />);
                            }
                            // Window pages
                            for (let p = start; p <= end; p++) {
                                items.push(
                                    <PaginationItem key={p}>
                                        <PaginationLink
                                            href="#"
                                            isActive={p === currentPage}
                                            onClick={(e) => { e.preventDefault(); setCurrentPage(p); }}
                                        >
                                            {p}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            }
                            // Trailing ellipsis + last page
                            if (end < totalPages) {
                                if (end < totalPages - 1) items.push(<PaginationEllipsis key="end-ellipsis" />);
                                items.push(
                                    <PaginationItem key={totalPages}>
                                        <PaginationLink
                                            href="#"
                                            isActive={currentPage === totalPages}
                                            onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }}
                                        >
                                            {totalPages}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            }
                            return items;
                        })()}

                        {/* Next */}
                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage((p) => Math.min(totalPages, p + 1)); }}
                                aria-disabled={currentPage === totalPages}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                            />
                        </PaginationItem>

                    </PaginationContent>
                </Pagination>
                <div className="flex justify-between items-center gap-2">
                    <Label htmlFor="pageSize" className="text-sm">Rows per page:</Label>
                    <Select
                        onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}
                        value={String(pageSize)}
                    >
                        <SelectTrigger className="w-[80px] h-8">
                            <SelectValue id="pageSize" placeholder="Select page size" />
                        </SelectTrigger>
                        <SelectContent className="w-fit">
                            {[10, 20, 30, 50].map(size => (
                                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</div>
            </div>
        </>
    );
};

export default VehicleManagement;
