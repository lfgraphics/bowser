"use client"
import FuelRecordCard from '@/components/FuelRecord';
import { BASE_URL } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { DispensesRecord } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

export const page = ({ params }: { params: Promise<{ id: string }> }) => {
    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);

    const dummyRecord: DispensesRecord = {
        _id: "someId",
        orderId: "ObjectId",
        category: "Own",
        party: "Own",
        location: "Default Location",
        tripSheetId: "XXXX",
        vehicleNumberPlateImage: "string",
        vehicleNumber: "UPXXATXXXX",
        odometer: "XXXXXX",
        driverName: "Driver Name",
        driverId: "ITPLId",
        driverMobile: "0123456789",
        fuelMeterImage: ["string", "somethine else"],
        slipImage: "string",
        fuelQuantity: "XXX.XX",
        quantityType: "Full",
        gpsLocation: "XYZ",
        fuelingDateTime: `${new Date().toLocaleString}`,
        verified: {
            status: false
        },
        bowser: {
            regNo: "UPXXATXXXX",
            driver: {
                name: "Bowser Driver",
                id: "ID",
                phoneNo: "0123456789"
            }
        },
        allocationAdmin: {
            name: "Allocator name",
            id: "Allocator Number/ Id"
        },
    }

    const [record, setRecord] = useState<DispensesRecord>(dummyRecord);
    useEffect(() => {
        const fetchRecords = async () => {
            const { id } = await params
            try {
                const response = await axios.get(`${BASE_URL}/listDispenses/${id}`);
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