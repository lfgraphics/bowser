"use client"

import React from 'react';
import { TankersTrip, TransAppUser, TripStatusUpdateEnums, tripStatusUpdateVars, TripsStats } from '@/types';
import VehiclesMainFilter from './VehiclesMainFilter';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import AdminLoadingPlanner from '@/components/AdminLoadingPlanner';
import { Pen, X } from 'lucide-react';
import { TripsFilter } from './TripsFilter';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { formatManagerName } from '@/utils';
import { FixedSizeList as List } from 'react-window';
import getFilterConfig, { DropdownItem } from './filterConfig';
import { useRef, useEffect, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

interface RowData {
    bucketData: TankersTrip[];
    setViewingTrip: (trip: TankersTrip | null) => void;
    setIsOpen: (open: boolean) => void;
    icon: string;
    tripStatusUpdateVars: string[];
    setStatusUpdate: (update: any) => void;
    isAdmin: boolean;
    selectedFilter: string | undefined;
}

const Row = ({ index, style, data }: { index: number, style: React.CSSProperties, data: RowData }) => {
    const { bucketData, setViewingTrip, setIsOpen, icon, tripStatusUpdateVars, setStatusUpdate, isAdmin, selectedFilter } = data;
    const cfg = getFilterConfig(selectedFilter || "", isAdmin);
    const trip = bucketData[index];

    return (
        <div style={style}>
            <div className='bg-linear-to-r from-[#141414] to-[#373535] h-[98px] rounded-[12px] drop-shadow-[0, 8px, 8px, rgba(0, 0, 0, 0.25)] mx-1'>
                <div className='flex flex-col p-4 items-start'>
                    <div className='flex flex-row w-full justify-between mb-2'>
                        <div className='flex flex-row gap-4' onClick={() => { setViewingTrip(trip); setIsOpen(true); }}>
                            {icon && <img src={icon} alt="icon" width={24} height={24} />}
                            <h4 className='text-[20px] font-bold'>{trip.VehicleNo}</h4>
                        </div>
                        <div className="actions flex flex-row gap-2">
                            {cfg.showDropdown && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            Update
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className='dropdown'>
                                        {cfg.dropdownItems ? cfg.dropdownItems.map((item: DropdownItem) => (
                                            item.action === 'statusUpdate' ? (
                                                <DropdownMenuItem key={item.label} onClick={(e) => { e.stopPropagation(); setStatusUpdate({ tripId: trip?._id, status: item.status as TripStatusUpdateEnums }) }}>
                                                    {item.label}
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem key={item.label}>
                                                    <Link href={{
                                                        pathname: item.link!.pathname,
                                                        query: { ...item.link!.query, tripId: trip?._id }
                                                    }} onClick={(e) => e.stopPropagation()}>{item.label}</Link>
                                                </DropdownMenuItem>
                                            )
                                        )) : (
                                            <>
                                                {tripStatusUpdateVars.filter((option: string) => !["Loaded", "In Distillery", "In Depot"].includes(option)).map((statupOpetion: string) => (
                                                    <DropdownMenuItem key={statupOpetion} onClick={(e) => { e.stopPropagation(); setStatusUpdate({ tripId: trip?._id, status: statupOpetion as TripStatusUpdateEnums }) }}>
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
                                                    }} onClick={(e) => e.stopPropagation()}>Reported</Link>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {cfg.showAdminLoadingPlanner && trip?.superwiser && isAdmin && (
                                <AdminLoadingPlanner
                                    trip={trip}
                                    manager={trip.superwiser}
                                    trigger={cfg.adminPlannerProps?.trigger || "Order"}
                                    type={cfg.adminPlannerProps?.type || "new"}
                                />
                            )}
                            {!isAdmin && <Button variant="outline" size="sm" className='link'>
                                <Link href={`/trans-app/trip-update/${trip?._id}`} onClick={(e) => e.stopPropagation()}>
                                    <Pen />
                                </Link>
                            </Button>}
                        </div>
                    </div>
                    <div className='flex flex-row gap-4 items-center' onClick={() => { setViewingTrip(trip); setIsOpen(true); }}>
                        <img src='/icons/newThemeIcons/load-onway.svg' alt="icon" width={24} height={24} />
                        <h4 className='text-[20px] font-bold'>{trip.EndTo.split(':')[1] || trip.EndTo}</h4>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VirtualList = ({ bucketData, setViewingTrip, setIsOpen, icon, isAdmin, tripStatusUpdateVars, setStatusUpdate, selectedFilter }: RowData) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<any>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.target === containerRef.current) {
                    setSize({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height
                    });
                }
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Scroll to top when bucketData changes (filter change)
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollToItem(0, "start");
        }
    }, [bucketData]);

    return (
        <div ref={containerRef} className="mt-4 flex-1 w-full overflow-hidden">
            {bucketData.length === 0 && <h4 className="text-center mt-4">No Trips Found</h4>}
            {size.height > 0 && (
                <List
                    ref={listRef}
                    height={size.height}
                    width={size.width}
                    itemCount={bucketData.length}
                    itemSize={110}
                    itemData={{ bucketData, setViewingTrip, setIsOpen, icon, isAdmin, tripStatusUpdateVars, setStatusUpdate, selectedFilter }}
                >
                    {Row}
                </List>
            )}
        </div>
    );
};


interface MainViewProps {
    user: TransAppUser | undefined;
    stats: TripsStats | undefined;
    bucketData: TankersTrip[] | undefined;
    pagination: any;
    selectedFilter: string;
    handleFilterClick: (filterKey: string) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    sortBy: string;
    setSortBy: (sort: string) => void;
    direction: string;
    setDirection: (dir: string) => void;
    icon: string;
    isLoading: boolean;
    hasError: any;
    page: number;
    setPage: (page: number) => void;
    pageSize: number;
    setPageSize: (pageSize: number) => void;
    statusUpdate: { tripId: string; status: TripStatusUpdateEnums; comment?: string } | null;
    setStatusUpdate: (update: any) => void;
    updateTripStatus: () => Promise<void>;
    mutateStats: () => void;
    mutateBucket: () => void;
    isAdmin: boolean;
}

const MainView = ({
    user,
    stats,
    bucketData,
    pagination,
    selectedFilter,
    handleFilterClick,
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
    icon,
    isLoading,
    hasError,
    statusUpdate,
    setStatusUpdate,
    updateTripStatus,
    mutateStats,
    mutateBucket,
    isAdmin
}: MainViewProps) => {

    const generateFilterKey = (categoryKey: string, label: string) => {
        return `${categoryKey}_${(label || "").toLowerCase().replace(/\s+/g, '_')}`;
    };

    const [viewingTrip, setViewingTrip] = React.useState<TankersTrip | null>(null);
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="flex flex-col h-[85svh] overflow-hidden">
            {stats && (
                <div className="flex flex-row gap-4 overflow-x-auto pb-2 shrink-0">
                    {Object.entries(stats as TripsStats).map(([categoryKey, statItem]: [string, any]) =>
                        statItem ? (
                            <VehiclesMainFilter
                                key={categoryKey}
                                icon={statItem.icon}
                                selectedFilter={selectedFilter}
                                onFilterClick={handleFilterClick}
                                mainFilterKey={categoryKey}
                                filters={statItem.filters.map((filter: any) => ({
                                    icon: filter.icon,
                                    count: filter.count,
                                    label: filter.label ?? filter.lable ?? "",
                                    filterKey: generateFilterKey(categoryKey, filter.label ?? filter.lable ?? ""),
                                }))}
                            />
                        ) : null
                    )}
                </div>
            )}

            {(isLoading && !bucketData?.length) && <div className="p-4 shrink-0 text-center">Loading trips...</div>}

            {hasError && <div className="p-4 text-red-500 shrink-0 text-center">Error loading data</div>}

            {bucketData && (
                <VirtualList
                    bucketData={bucketData}
                    setViewingTrip={setViewingTrip}
                    setIsOpen={setIsOpen}
                    icon={icon}
                    isAdmin={isAdmin}
                    tripStatusUpdateVars={tripStatusUpdateVars}
                    setStatusUpdate={setStatusUpdate}
                    selectedFilter={selectedFilter}
                />
            )}

            {/* Search, Sort and Pagination Filter */}
            <TripsFilter
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                sortBy={sortBy}
                setSortBy={setSortBy}
                direction={direction}
                setDirection={setDirection}
                page={page}
                setPage={setPage}
                pageSize={pageSize}
                setPageSize={setPageSize}
                pagination={pagination}
                className="sticky bottom-0 left-0 right-0 z-50"
            />

            <Drawer
                open={isOpen}
                onOpenChange={setIsOpen}
                onClose={() => { setViewingTrip(null); setIsOpen(false) }}
            >
                <DrawerContent className="mx-auto w-full max-w-lg md:max-w-7xl px-4 max-h-[80svh]">
                    <DrawerHeader className="border-b">
                        <div className="flex justify-between">
                            <DrawerTitle className='text-left text-[18px] font-bold'>{viewingTrip?.VehicleNo}</DrawerTitle>
                            <DrawerClose asChild>
                                <Button variant="outline" size="icon" onClick={() => { setViewingTrip(null); setIsOpen(false) }}>
                                    <X />
                                </Button>
                            </DrawerClose>
                        </div>
                        <div className="flex justify-between">
                            <h3 className='text-left text-[16px] font-semibold'>Ship to: {viewingTrip?.EndTo?.split(':')[1] || viewingTrip?.EndTo}</h3>
                            <span className={`${viewingTrip?.LoadStatus === 1 ? "text-green-500" : "text-orange-400"} font-semibold text-sm`}>
                                {viewingTrip?.LoadStatus === 1 ? "Loaded" : "Empty"}
                            </span>
                        </div>
                    </DrawerHeader>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        <span className='text-[18px] font-extralight text-muted-foreground'>From:</span>
                        <h4 className='text-[18px] col-span-3'>{viewingTrip?.StartFrom}</h4>

                        <span className='text-[18px] font-extralight text-muted-foreground'>Started on:</span>
                        <h4 className='text-[18px] col-span-3'>{viewingTrip?.StartDate ? formatDate(viewingTrip.StartDate).split(',')[0] : ''}</h4>

                        <span className='text-[18px] font-extralight text-muted-foreground'>Manager:</span>
                        <h4 className='text-[18px] col-span-3'>{viewingTrip?.superwiser ? formatManagerName(viewingTrip.superwiser) : ''}</h4>

                        <span className='text-[18px] font-extralight text-muted-foreground'>Product:</span>
                        <h4 className='text-[18px] col-span-3'>{viewingTrip?.TallyLoadDetail?.Goods}</h4>

                        <span className='text-[18px] font-extralight text-muted-foreground'>QTY:</span>
                        <h4 className='text-[18px] col-span-3'>{viewingTrip?.TallyLoadDetail?.LoadingQty}</h4>

                        <span className='text-[18px] font-extralight text-muted-foreground'>Driver:</span>
                        <h4 className='text-[18px] col-span-3'>{viewingTrip?.StartDriver}</h4>

                        {viewingTrip?.StartDriverMobile &&
                            <>
                                <span className='text-[18px] font-extralight text-muted-foreground'>Mobile:</span>
                                <h4 className='text-[18px] col-span-3'>{viewingTrip.StartDriverMobile}</h4>
                            </>
                        }

                    </div>
                    <div className="footer my-2 flex gap-2">
                        {(() => {
                            const cfg = getFilterConfig(selectedFilter, isAdmin);
                            return (
                                <>
                                    {cfg.showDropdown && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    Update
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className='dropdown'>
                                                {cfg.dropdownItems ? cfg.dropdownItems.map((item: DropdownItem) => (
                                                    item.action === 'statusUpdate' ? (
                                                        <DropdownMenuItem key={item.label} onClick={(e) => { e.stopPropagation(); setStatusUpdate({ tripId: viewingTrip?._id, status: item.status as TripStatusUpdateEnums }) }}>
                                                            {item.label}
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem key={item.label}>
                                                            <Link href={{
                                                                pathname: item.link!.pathname,
                                                                query: { ...item.link!.query, tripId: viewingTrip?._id }
                                                            }} onClick={(e) => e.stopPropagation()}>{item.label}</Link>
                                                        </DropdownMenuItem>
                                                    )
                                                )) : (
                                                    <>
                                                        {tripStatusUpdateVars.filter((option: string) => !["Loaded", "In Distillery", "In Depot"].includes(option)).map((statupOpetion: string) => (
                                                            <DropdownMenuItem key={statupOpetion} onClick={(e) => { e.stopPropagation(); setStatusUpdate({ tripId: viewingTrip?._id, status: statupOpetion as TripStatusUpdateEnums }) }}>
                                                                {statupOpetion}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuItem>
                                                            <Link href={{
                                                                pathname: "trans-app/unloading-tracker",
                                                                query: {
                                                                    actionType: "report",
                                                                    tripId: viewingTrip?._id
                                                                }
                                                            }} onClick={(e) => e.stopPropagation()}>Reported</Link>
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                    {cfg.showAdminLoadingPlanner && viewingTrip?.superwiser && isAdmin && (
                                        <AdminLoadingPlanner
                                            trip={viewingTrip}
                                            manager={viewingTrip.superwiser}
                                            trigger={cfg.adminPlannerProps?.trigger || "Order"}
                                            type={cfg.adminPlannerProps?.type || "new"}
                                        />
                                    )}
                                    {!isAdmin && <Button variant="outline" size="sm" className='link'>
                                        <Link href={`/trans-app/trip-update/${viewingTrip?._id}`} onClick={(e) => e.stopPropagation()}>
                                            <Pen />
                                        </Link>
                                    </Button>}
                                </>
                            );
                        })()}
                    </div>
                </DrawerContent>
            </Drawer>

            <AlertDialog open={Boolean(statusUpdate)} onOpenChange={() => setStatusUpdate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        Update the trip status to {statusUpdate?.status}
                    </AlertDialogHeader>
                    <AlertDialogDescription className='text-foreground'>
                        <Label htmlFor='tripstatusUpdateComment'>Comment</Label>
                        <Input
                            id='tripstatusUpdateComment'
                            value={statusUpdate?.comment || ""}
                            onChange={(e) => setStatusUpdate((prev: any) => prev ? { ...prev, comment: e.target.value } : null)}
                            placeholder='Add a comment (optional)'
                        />

                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => updateTripStatus()}>Update</AlertDialogAction>
                        <AlertDialogCancel onClick={() => setStatusUpdate(null)}>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
export default MainView;
