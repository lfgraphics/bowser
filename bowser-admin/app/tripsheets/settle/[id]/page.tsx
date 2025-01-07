"use client"
import Loading from '@/app/loading';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Get user details from local storage
        const storedUserJson = localStorage.getItem("adminUser");
        let userDetails = { id: "", name: "", phoneNumber: "" };
        if (storedUserJson) {
            const storedUser = JSON.parse(storedUserJson);
            userDetails = {
                id: storedUser.userId || "",
                name: storedUser.name || "",
                phoneNumber: storedUser.phoneNumber || "",
            };
        }

        // Submit the chamberwiseDipList to the server
        try {
            const response = await axios.post(`${BASE_URL}/tripsheet/settle/${params.id}`, {
                chamberwiseDipList,
                pumpReading,
                odometer,
                dateTime,
                userDetails,
                extras: {
                    filledByDriver,
                    saleryDays,
                    foodingDays,
                    rewardTrips,
                    hsdRateFor,
                    tollTax,
                    borderOtherExp,
                    unload,
                    hsdPerKm
                }
            });
            if (response.status === 200) {
                alert('Settlement submitted successfully!');
                handlePrint();
            }
        } catch (error) {
            console.error('Error submitting settlement:', error);
            setError('Error submitting settlement');
        } finally {
            setLoading(false);
        }
    };


    const handlePrint = () => {
        const printURL = `${window.location.origin}/tripsheets/settle/print/${params.id}`; // Your print route
        const newWindow = window.open(printURL, '_blank');
        newWindow?.focus();

        // Wait for 5 seconds before calling print
        setTimeout(() => {
            newWindow?.print(); // Open the print dialog
        }, 5000); // 5000 milliseconds = 5 seconds
    };

    return (
        <div className='flex flex-col gap-3 pt-8'>
            {loading && <Loading />}
            <h1>Settlement/closeing of TripSheet ID: {tripSheet?.tripSheetId}</h1>
            <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
                <h2>Chamberwise Dip List on return</h2>
                {chamberwiseDipList.map((dip, index) => (
                    <div key={dip.chamberId}>
                        <Label htmlFor={`${dip.chamberId}`}>{dip.chamberId}</Label>
                        <Input
                            id={`${dip.chamberId}`}
                            type="number"
                            placeholder="Level Height in cm"
                            value={dip.levelHeight}
                            onChange={(e) => {
                                const newLevelHeight = Number(e.target.value);
                                setChamberwiseDipList(prev => {
                                    const updatedDipList = [...prev];
                                    updatedDipList[index].levelHeight = newLevelHeight;
                                    return updatedDipList;
                                });
                            }}
                            required
                        />
                    </div>
                ))}
                <Label htmlFor={`pumpEndReading`}>Bowser pump end reading</Label>
                <Input
                    id={`pumpEndReading`}
                    type="number"
                    placeholder="Pump End reading"
                    value={pumpReading}
                    onChange={(e) => { setPumpReading(Number(e.target.value)) }}
                    required
                />
                <Label htmlFor={`odoMeterReading`}>Bowser odometer reading</Label>
                <Input
                    id={`odoMeterReading`}
                    type="number"
                    placeholder="Odometer End reading"
                    value={odometer}
                    onChange={(e) => { setOdometer(Number(e.target.value)) }}
                    required
                />
                <Label htmlFor={`pumpEndReading`}>Settlment Date, Time</Label>
                <Input
                    id={`pumpEndReading`}
                    type="datetime-local"
                    placeholder="end reading"
                    value={String(dateTime)}
                    onChange={(e) => { setDateTime(e.target.value) }}
                    required
                />
                <Separator className='my-7' />
                <h3 className='font-semibold text-xl'>Distripbution Cost Details</h3>
                <Label htmlFor={`unload`}>Unload</Label>
                <Input
                    id={`unload`}
                    type="number"
                    placeholder="Unload"
                    value={unload}
                    onChange={(e) => { setUnload(Number(e.target.value)) }}
                    required
                />
                <Label htmlFor={`hsdPerKm`}>HSD @ Km/Lt.</Label>
                <Input
                    id={`hsdPerKm`}
                    type="number"
                    placeholder="HSD Per Km"
                    value={hsdPerKm}
                    onChange={(e) => { setHsdPerKm(Number(e.target.value)) }}
                    required
                />
                <Separator />
                <Label htmlFor={`filledByDriver`}>Filled By Driver</Label>
                <Input
                    id={`filledByDriver`}
                    type="text"
                    placeholder="Filled By Driver"
                    value={filledByDriver}
                    onChange={(e) => { setFilledByDriver(Number(e.target.value)) }}
                    required
                />
                <Label htmlFor={`saleryDays`}>Salary Days</Label>
                <Input
                    id={`saleryDays`}
                    type="number"
                    placeholder="Salary Days"
                    value={saleryDays}
                    onChange={(e) => { setSaleryDays(Number(e.target.value)) }}
                    required
                />
                <Label htmlFor={`foodingDays`}>Fooding Days</Label>
                <Input
                    id={`foodingDays`}
                    type="number"
                    placeholder="Fooding Days"
                    value={foodingDays}
                    onChange={(e) => { setFoodingDays(Number(e.target.value)) }}
                    required
                />
                <Label htmlFor={`rewardTrips`}>Reward Trips</Label>
                <Input
                    id={`rewardTrips`}
                    type="number"
                    placeholder="Reward Trips"
                    value={rewardTrips}
                    onChange={(e) => { setRewardTrips(Number(e.target.value)) }}
                    required
                />
                <Label htmlFor={`hsdRateFor`}>HSD Rate For</Label>
                <Input
                    id={`hsdRateFor`}
                    type="text"
                    placeholder="HSD Rate For"
                    value={hsdRateFor}
                    onChange={(e) => { setHsdRateFor(Number(e.target.value)) }}
                    required
                />
                <Label htmlFor={`tollTax`}>Toll Tax</Label>
                <Input
                    id={`tollTax`}
                    type="number"
                    placeholder="Toll Tax"
                    value={tollTax}
                    onChange={(e) => { setTollTax(Number(e.target.value)) }}
                    required
                />
                <Label htmlFor={`borderOtherExp`}>Border Other Exp</Label>
                <Input
                    id={`borderOtherExp`}
                    type="number"
                    placeholder="Border Other Exp"
                    value={borderOtherExp}
                    onChange={(e) => { setBorderOtherExp(Number(e.target.value)) }}
                    required
                />
                <Button type="submit">Submit Settlement</Button>
            </form>
            {error && <div>{error}</div>}
        </div>
    );
};

export default SettlementPage;