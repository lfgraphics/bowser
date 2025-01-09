"use client"
import Loading from '@/app/loading';
import TripCalculationModal from '@/components/exclusive/TripCalculationModal';
import { WholeTripSheet } from '@/types';
import React from 'react';
import { fetchTripSheet } from '@/lib/serverSideFunctions'; // Import the server action

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