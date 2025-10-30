"use client";

import TripSheetPage from '@/components/TripSheet';
import { useSearchParams } from 'next/navigation';

const Page = () => {
    const searchParams = useSearchParams();

    const query = Object.fromEntries(searchParams.entries());

    return <TripSheetPage query={query} />;
};

export default Page;