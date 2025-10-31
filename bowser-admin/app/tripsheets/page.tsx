"use client";

import TripSheetPage from '@/components/TripSheet';
import { useSearchParams } from 'next/navigation';

const Page = () => {
    const searchParams = useSearchParams();

    const query = Object.fromEntries(searchParams.entries());
    console.log("TripSheet Page Query Params:", query);

    return <TripSheetPage />;
};

export default Page;