import useSWR from 'swr';
import { BASE_URL } from '@/lib/api';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type FilterType = 'loadedOnWay' | 'loadedReported' | 'emptyOnWay' | 'emptyReported' | 'emptyStanding' | 'outsideStanding' | 'loaded' | 'otherStanding';

interface SummaryStats {
    loaded: {
        onWay: { count: number };
        reported: { count: number };
    };
    empty: {
        onWay: { count: number };
        reported: { count: number };
        standing: { count: number };
        outsideStanding: { count: number };
        loaded: { count: number };
        otherStanding: { count: number };
    };
}

interface BucketDataResponse {
    bucket: string;
    totalCount: number;
    matchedCount: number;
    data: any[];
    pagination: {
        currentPage: number;
        totalPages: number;
        pageSize: number;
        hasMore: boolean;
    };
    searchTerm: string;
    sortBy: string;
    direction: string;
}

export function useVehicleSummaryStats(userId: string | undefined, isAdmin: boolean) {
    const url = userId
        ? `${BASE_URL}/trans-app/dash-vehicles/summary-stats/${userId}`
        : null;

    const { data, error, isLoading, mutate } = useSWR<SummaryStats>(url, fetcher, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        dedupingInterval: 1000 * 60 * 60,
    });

    return {
        stats: data,
        error,
        isLoading,
        mutate
    };
}

export function useVehicleBucketData({
    userId,
    isAdmin,
    bucket = 'loadedOnWay',
    searchTerm = '',
    sortBy = 'EndTo',
    direction = 'asc',
    pageSize = 50,
    page = 1,
    enabled = true
}: {
    userId: string | undefined;
    isAdmin: boolean;
    bucket: FilterType;
    searchTerm?: string;
    sortBy?: string;
    direction?: 'asc' | 'desc';
    pageSize?: number;
    page?: number;
    enabled?: boolean;
}) {
    const url = userId && enabled
        ? `${BASE_URL}/trans-app/dash-vehicles/bucket-data/${userId}?bucket=${bucket}&searchTerm=${encodeURIComponent(searchTerm)}&sortBy=${sortBy}&direction=${direction}&pageSize=${pageSize}&page=${page}&isAdmin=${isAdmin}`
        : null;

    const { data, error, isLoading, mutate } = useSWR<BucketDataResponse>(url, fetcher, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        dedupingInterval: 1000 * 60 * 60,
        keepPreviousData: true,
    });

    return {
        data: data?.data || [],
        pagination: data?.pagination || {
            currentPage: 1,
            totalPages: 0,
            pageSize: 50,
            hasMore: false
        },
        totalCount: data?.totalCount || 0,
        error,
        isLoading,
        mutate
    };
}
