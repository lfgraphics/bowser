"use client"
import FuelRecordCard from '@/components/FuelRecord';
import { isAuthenticated } from '@/lib/auth';
import { DispensesRecord } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

export const page = ({ params }: { params: { id: string } }) => {
    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);
    
    const [record, setRecord] = useState<DispensesRecord>();
    useEffect(() => {
        const fetchRecords = async () => {
            try {
                const response = await axios.get(`https://bowser-backend-2cdr.onrender.com/listDispenses/${params.id}`);
                setRecord(response.data);
            } catch (error) {
                console.error('Error fetching records:', error);
            }
        };

        fetchRecords();
    }, []);
    return (
        <div><FuelRecordCard record={record} /></div>
    )
}

export default page