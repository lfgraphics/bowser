"use client"
import { BASE_URL } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { TripSheet } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

const page = ({ params }: { params: { id: string } }) => {
    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);
    const [record, setRecord] = useState<TripSheet | undefined>();
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${BASE_URL}/tripsheet/find-by-id/${params.id}`);
                const sheetData = response.data;
                // Update the state with the correct structure
                setRecord(sheetData);
                console.log(sheetData)
            } catch (error) {
                console.error('Error fetching records:', error);
                alert(`Error fetching records: ${error}`);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [params.id]);
    return (
        <div className='pt-8'>This page is under development right now please reach out to the dev team for any query</div>
    )
}

export default page