"use client";
import { BASE_URL } from '@/lib/api';
import { FuelRequest } from '@/types';
import React, { useEffect, useState } from 'react'
import Loading from '../loading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu"
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogContent, AlertDialogAction } from '@/components/ui/alert-dialog';
import { formatDate } from '@/lib/utils';

const page = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FuelRequest[] | []>([]);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState<boolean>(false);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);

    const [deletingRequestId, setDeletingRequestId] = useState<string>('');


    const fetchFuelRequests = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BASE_URL}/fuel-request`);
            const data = await response.json();
            console.log(data);
            setData(data);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchFuelRequests();
    }, []);
    const openDeleteDialogue = (sheetId: string) => {
        setDeletingRequestId(sheetId)
        setShowDeleteDialog(true)
    }
    const handleDelete = async () => {
        try {
            let response = await fetch(`${BASE_URL}/fuel-request/${deletingRequestId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to delete');
            }
            setShowSuccessAlert(true);
            window.location.reload();
        } catch (error) {
            console.error(error);
            setError(String(error));
            setShowErrorAlert(true);
        } finally {
            setShowDeleteDialog(false);
        }
    };

    return (
        <>
            {loading && <Loading />}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-8">
                {data?.length && data.length > 0 ? data.map((request, index) => (
                    <Card key={index}>
                        <CardHeader>
                            <CardTitle>{request.vehicleNumber}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Name: {request.driverName}
                            <br />
                            Id: {request.driverId}
                            <br />
                            Mobile No.: <Link className='text-blue-500 visited:text-purple-500' href={`tel:${request.driverMobile}`}>{request.driverMobile}</Link>
                            <br />
                            Request Time: {formatDate(request.createdAt)}
                        </CardContent>
                        <CardFooter>
                            <div className='flex flex-row justify-between items-center w-full'>
                                <Button variant="destructive" size="lg" onClick={() => openDeleteDialogue(request._id!)}>Delete</Button>
                                <DropdownMenu >
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="default" size="lg" className='p-4 h-10 text-center'>
                                            Allocate
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className='bg-card text-center'>
                                        <DropdownMenuItem>
                                            <Link className='w-full' type='button' href={{
                                                pathname: "dashboard", query: {
                                                    id: request._id,
                                                    vehicleNumber: request.vehicleNumber,
                                                    driverId: request.driverId,
                                                    driverName: request.driverName,
                                                    driverMobile: request.driverMobile,
                                                    allocationType: "bowser"
                                                }
                                            }} >
                                                <Button variant="default" size="lg">By Bowser</Button>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Link className='w-full' type='button' href={{
                                                pathname: "dashboard", query: {
                                                    id: request._id,
                                                    vehicleNumber: request.vehicleNumber,
                                                    driverId: request.driverId,
                                                    driverName: request.driverName,
                                                    driverMobile: request.driverMobile,
                                                    allocationType: "external"
                                                }
                                            }} >
                                                <Button variant="default" size="lg">By Petrol Pump</Button>
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardFooter>
                    </Card>
                )) : !loading && <div className='text-2xl text-center'>No fuel requests found</div>}
            </div>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete fuel request? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => handleDelete()}>Delete</AlertDialogAction>
                    <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
                </AlertDialogContent>
            </AlertDialog>
            {
                showSuccessAlert && (
                    <AlertDialog open={showSuccessAlert} onOpenChange={setShowSuccessAlert}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Success!</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Operation completed successfully.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogAction onClick={() => setShowSuccessAlert(false)}>Close</AlertDialogAction>
                        </AlertDialogContent>
                    </AlertDialog>
                )
            }
            {
                error && (
                    <AlertDialog open={showErrorAlert} onOpenChange={setShowErrorAlert}>
                        <AlertDialogContent className='bg-red-600 text-white'>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Error</AlertDialogTitle>
                                <AlertDialogDescription className='text-white'>
                                    {String(error)}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogAction onClick={() => setShowErrorAlert(false)}>Close</AlertDialogAction>
                        </AlertDialogContent>
                    </AlertDialog>
                )
            }
        </>
    )
}

export default page;