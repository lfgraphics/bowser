"use client"
import TripSheetPage from '@/components/TripSheet'
import { isAuthenticated } from '@/lib/auth';
import React, { useEffect } from 'react'

const page = () => {
    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);
    return (
        <TripSheetPage />
    )
}

export default page;