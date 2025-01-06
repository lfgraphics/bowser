"use client"
import Loading from '@/app/loading';
import TripCalculationModal from '@/components/exclusive/TripCalculationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BASE_URL } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { WholeTripSheet } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

const SettlementPage = ({ params }: { params: { id: string } }) => {
    const [tripSheet, setTripSheet] = useState<WholeTripSheet | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [chamberwiseDipList, setChamberwiseDipList] = useState<
        { chamberId: string; levelHeight: number }[]
    >([]);
    const [pumpReading, setPumpReading] = useState<number>()
    const [odometer, setOdometer] = useState<number>()
    const [dateTime, setDateTime] = useState<string>()

    // manual Entries for final calculation
    const [unload, setUnload] = useState<number>()
    const [tollTax, setTollTax] = useState<number>()
    const [borderOtherExp, setBorderOtherExp] = useState<number>()
    const [hsdPerKm, setHsdPerKm] = useState<number>(15)
    const [filledByDriver, setFilledByDriver] = useState<number>()
    const [hsdRateFor, setHsdRateFor] = useState<number>(89.99)
    const [saleryDays, setSaleryDays] = useState<number>(4)
    const [foodingDays, setFoodingDays] = useState<number>(4)
    const [rewardTrips, setRewardTrips] = useState<number>(1)

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        const fetchTripSheet = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${BASE_URL}/tripsheet/${params.id}`);
                const data: WholeTripSheet = response.data;
                setTripSheet(data);

                // Initialize chamberwise dip list based on fetched TripSheet data
                if (data.bowser && data.loading.sheetId.chamberwiseDipListAfter) {
                    setChamberwiseDipList(data.loading.sheetId.chamberwiseDipListAfter.map(dip => ({
                        chamberId: dip.chamberId,
                        levelHeight: 0,
                    })));
                }
            } catch (error) {
                console.error('Error fetching TripSheet:', error);
                setError('Error fetching TripSheet data');
            } finally {
                setLoading(false);
            }
        };

        fetchTripSheet();
    }, [params.id]);

    return (
        <div className='flex flex-col gap-3 pt-8'>
            {loading && <Loading />}
            {/* <h1>Print {tripSheet?.tripSheetId}</h1> */}
            {tripSheet && <TripCalculationModal record={tripSheet} />}
            {error && <div>{error}</div>}
        </div>
    );
};

export default SettlementPage;