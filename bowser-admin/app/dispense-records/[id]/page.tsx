"use client"
import FuelRecordCard from '@/components/FuelRecord';
import { DispensesRecord } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

export const page = ({ params }: { params: { id: string } }) => {
    const [record, setRecord] = useState<DispensesRecord>();
    useEffect(() => {
        const fetchRecords = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/listDispenses/${params.id}`);
                setRecord(response.data);
                console.log(response.data)
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