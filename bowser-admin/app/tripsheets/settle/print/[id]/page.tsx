import Loading from '@/app/loading';
import TripCalculationModal from '@/components/exclusive/TripCalculationModal';
import { WholeTripSheet } from '@/types';
import React from 'react';
import { fetchTripSheet } from '@/lib/serverSideFunctions';
import { BASE_URL } from '@/lib/api';
import { Metadata } from 'next';

export async function generateMetadata({ params, searchParams }: { params: Record<string, any>; searchParams: Record<string, any> }): Promise<Metadata> {
    const dynamicUrl = new URL(`${BASE_URL}${params.slug ? `/${params.slug}` : ""}`);

    if (searchParams && typeof searchParams === "object") {
        Object.entries(searchParams).forEach(([key, value]) => {
            dynamicUrl.searchParams.append(key, value as string);
        });
    }

    return {
        metadataBase: new URL(BASE_URL!),
        title: "Triphsheet final print | ITPL DCS",
        description: "Trip sheet's final calculation and print after returnig the bowser",
        openGraph: {
            // images: ["https://avatar.iran.liara.run/public/boy"],
            url: dynamicUrl.toString()
        },
    };
}

const SettlementPage = async ({ params }: { params: { id: string } }) => {
    const { id } = params;
    const tripSheet: WholeTripSheet = await fetchTripSheet(id); // Fetch data directly
    const error = tripSheet ? null : 'Error fetching TripSheet data'; // Handle error if needed

    return (
        <div className='-ml-4'>
            {!tripSheet && <Loading />}
            {tripSheet && <TripCalculationModal record={tripSheet} />}
            {error && <div>{error}</div>}
        </div>
    );
};

export default SettlementPage;