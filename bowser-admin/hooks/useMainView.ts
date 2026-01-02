import { useEffect, useState } from 'react';
import { useCache } from '@/src/context/CacheContext';
import { useVehicleSummaryStats, useVehicleBucketData } from '@/hooks/useVehicleSummaryNew';
import { TripStatusUpdateEnums, TripsStats, TankersTrip } from '@/types';
import { useDebounceEffect } from '@/utils';
import { BASE_URL } from '@/lib/api';
import { toast } from 'sonner';

export function useMainView(userId: string | undefined, isAdmin: boolean, userName: string | undefined) {
    const { cache, setCache } = useCache();

    // Cache-backed state initialization
    const [selectedFilter, setSelectedFilter] = useState<string>(cache.filter ?? 'loaded_total_on_way');
    const [searchTerm, setSearchTerm] = useState<string>(cache.searchTerm ?? '');
    const [sortBy, setSortBy] = useState<string>(cache.sortBy ?? 'EndTo');
    const [direction, setDirection] = useState<string>(cache.direction ?? 'asc');
    const [page, setPage] = useState<number>(cache.page ?? 1);
    const [pageSize, setPageSize] = useState<number>(cache.pageSize ?? 100);
    const [statusUpdate, setStatusUpdate] = useState<{ tripId: string, status: TripStatusUpdateEnums, comment?: string } | null>(null);
    const [icon, setIcon] = useState<string>('');

    // Persist state to cache
    useEffect(() => {
        setCache((prev: any) => ({
            ...prev,
            filter: selectedFilter,
            searchTerm: searchTerm,
            sortBy: sortBy,
            direction: direction,
            page: page,
            pageSize: pageSize,
        }));
    }, [selectedFilter, searchTerm, sortBy, direction, page, pageSize, setCache]);

    // Debounced states for API calls
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const [debouncedSortBy, setDebouncedSortBy] = useState(sortBy);
    const [debouncedDirection, setDebouncedDirection] = useState(direction);

    // Debounce effects
    useDebounceEffect(() => {
        setDebouncedSearchTerm(searchTerm);
    }, 500, [searchTerm]);

    useDebounceEffect(() => {
        setDebouncedSortBy(sortBy);
        setDebouncedDirection(direction);
    }, 300, [sortBy, direction]);

    // Data Fetching hooks
    const { stats, error: statsError, isLoading: statsLoading, mutate: mutateStats } = useVehicleSummaryStats(userId, isAdmin);

    // Casting stats to the expected type
    const typedStats = stats as unknown as TripsStats | undefined;

    const {
        data: bucketData,
        pagination,
        totalCount,
        error: bucketError,
        isLoading: bucketLoading,
        mutate: mutateBucket
    } = useVehicleBucketData({
        userId,
        isAdmin,
        bucket: selectedFilter as any,
        searchTerm: debouncedSearchTerm,
        sortBy: debouncedSortBy,
        direction: debouncedDirection as 'asc' | 'desc',
        pageSize,
        page,
        enabled: !!userId
    });

    // Update icon when filter/stats change
    useEffect(() => {
        if (!typedStats) return;

        let found = false;
        Object.entries(typedStats).forEach(([catKey, statItem]) => {
            if (!statItem || found) return;

            // Main category match
            if (catKey === selectedFilter) {
                setIcon(statItem.icon);
                found = true;
                return;
            }

            // Sub filter match
            statItem.filters.forEach(filter => {
                const label = filter.label ?? filter.lable ?? "";
                const key = `${catKey}_${label.toLowerCase().replace(/\s+/g, '_')}`;
                if (key === selectedFilter) {
                    setIcon(filter.icon);
                    found = true;
                }
            });
        });
    }, [selectedFilter, typedStats]);

    const handleFilterClick = (filterKey: string) => {
        setSelectedFilter(filterKey);
        setPage(1);
    };

    const hasError = statsError || bucketError;

    const updateTripStatus = async () => {
        if (!statusUpdate) return;

        const obj = {
            dateTime: new Date(),
            user: {
                _id: userId,
                name: userName
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
            mutateStats();
            mutateBucket();

        } catch (error) {
            console.error(error);
            toast.error("Error", { description: String(error), richColors: true });
        }
    };

    return {
        stats: typedStats,
        bucketData,
        pagination,
        totalCount,
        selectedFilter,
        setSelectedFilter,
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
        isLoading: (bucketLoading && !bucketData?.length) || statsLoading,
        hasError,
        handleFilterClick,
        mutateStats,
        mutateBucket,
        updateTripStatus
    };
}

