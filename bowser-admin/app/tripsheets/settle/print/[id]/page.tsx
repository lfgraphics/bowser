"use client"
import Loading from '@/app/loading';
import TripCalculationModal from '@/components/exclusive/TripCalculationModal';
import { WholeTripSheet } from '@/types';
import React, { useEffect, useState } from 'react';
import { fetchTripSheet } from '@/lib/serverSideFunctions'; // Import the server action

const SettlementPage = ({ params }: { params: { id: string } }) => {
    const [tripSheet, setTripSheet] = useState<WholeTripSheet | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { id } = params;

    useEffect(() => {
        const loadTripSheet = async () => {
            try {
                const data = await fetchTripSheet(id); // Call the server action
                setTripSheet(data);
            } catch (err) {
                console.error('Error fetching TripSheet:', err);
                setError('Error fetching TripSheet data');
            }
        };

        loadTripSheet();
        if (window !== undefined) {
            document.getElementById('menuIcon')!.style.display = 'none';
        }
    }, [id]);

    return (
        <div className='-ml-4'>
            {!tripSheet && <Loading />}
            {tripSheet && <TripCalculationModal record={tripSheet} />}
            {error && <div>{error}</div>}
        </div>
    );
};

export default SettlementPage;