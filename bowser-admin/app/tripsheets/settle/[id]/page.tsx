"use client"
import Loading from '@/app/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BASE_URL } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { TripSheet } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

const SettlementPage = ({ params }: { params: { id: string } }) => {
    const [tripSheet, setTripSheet] = useState<TripSheet | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [chamberwiseDipList, setChamberwiseDipList] = useState<
        { chamberId: string; levelHeight: number }[]
    >([]);
    const [pumpReading, setPumpReading] = useState<number>()
    const [dateTime, setDateTime] = useState<string>()

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
                const response = await axios.get(`${BASE_URL}/tripsheet/find-by-id/${params.id}`);
                const data: TripSheet = response.data;
                setTripSheet(data);

                // Initialize chamberwise dip list based on fetched TripSheet data
                if (data.bowser && data.bowser.chamberwiseDipList) {
                    setChamberwiseDipList(data.bowser.chamberwiseDipList.map(dip => ({
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

        console.log(new Date(dateTime!).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }))

        // Submit the chamberwiseDipList to the server
        try {
            await axios.post(`${BASE_URL}/tripsheet/settle/${params.id}`, {
                chamberwiseDipList,
                pumpReading,
                dateTime,
                userDetails,
            });
            alert('Settlement submitted successfully!');
        } catch (error) {
            console.error('Error submitting settlement:', error);
            setError('Error submitting settlement');
        } finally {
            setLoading(false);
        }
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
                    placeholder="End reading"
                    value={pumpReading}
                    onChange={(e) => { setPumpReading(Number(e.target.value)) }}
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
                <Button type="submit">Submit Settlement</Button>
            </form>
            {error && <div>{error}</div>}
        </div>
    );
};

export default SettlementPage;