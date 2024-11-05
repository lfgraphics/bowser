"use client"
import TripSheetView from '@/components/TripSheetView';
import { TripSheet } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

export const page = ({ params }: { params: { id: string } }) => {
    const [record, setRecord] = useState<TripSheet>();

    console.log(params.id)
    useEffect(() => {
        const fetchRecords = async () => {
            try {
                //http://localhost:3001/tripsheets/view/6729ec498a0933364d52dda3
                const response = await axios.get(`https://bowser-backend-2cdr.onrender.com/tripsheet/find-by-id/${params.id}`);
                setRecord(response.data);
                console.log(response.data)
            } catch (error) {
                console.error('Error fetching records:', error);
            }
        };

        fetchRecords();
    }, []);
    return (
        <div><TripSheetView record={record} /></div>
    )
}

export default page