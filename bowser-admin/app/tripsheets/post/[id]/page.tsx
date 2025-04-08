"use client";
import Loading from '@/app/loading';
import { BASE_URL } from '@/lib/api';
import { WholeTripSheet } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

const page = ({ params }: { params: { id: string } }) => {
    const [loading, setLoading] = useState(true);
    const [record, setRecord] = useState<WholeTripSheet>();

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                setLoading(true)
                const response = await axios.get(`${BASE_URL}/tripSheet/${params.id}`);
                setRecord(response.data);
                console.log(response.data)
            } catch (error) {
                console.error('Error fetching records:', error);
            } finally {
                setLoading(false)
            }
        };

        fetchRecords();
    }, [params.id]);
  return (
    <div>
          {loading && <Loading />}
          <div className="mx-auto py-4">
              
          </div>
    </div>
  )
}

export default page
