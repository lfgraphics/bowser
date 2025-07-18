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
import { Input } from '@/components/ui/input';
import { User } from '@/types/auth';
import { isAuthenticated } from '@/lib/auth';
import { MapPin } from 'lucide-react';

const page = ({ params }: { params: { manager: string } }) => {
    const paramsManager = params.manager
    const [manager, setManager] = useState<string>(paramsManager)
    const [openItem, setOpenItem] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FuelRequest[] | []>([]);
    const [error, setError] = useState<string | null>(null);
    const [deleteMessage, setDeleteMessage] = useState<string>('');
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [haltingRequestId, setHaltingRequestId] = useState<string>('');
    const [haltMessage, setHaltMessage] = useState<string>('');
    const [showHaltDialog, setShowHaltDialog] = useState<boolean>(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState<boolean>(false);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
    const [user, setUser] = useState<User>()

    const [deletingRequestId, setDeletingRequestId] = useState<string>('');

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        const storedUser = localStorage.getItem('adminUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        if (!user?.userId) return;
        fetchFuelRequests();
    }, [user]);

    const fetchFuelRequests = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BASE_URL}/fuel-request?manager=${user?.userId}&fulfilled=false`);
            const data = await response.json();
            setData(data.requests);
            const unseenRequestIds: string[] = data.requests.filter((req: FuelRequest) => !req.seen).map((req: FuelRequest) => req._id!);
            console.log('data:', unseenRequestIds);
            console.log('Unseen Request IDs:', unseenRequestIds);
            if (unseenRequestIds.length > 0) {
                await markAsSeen(unseenRequestIds);
            }
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const markAsSeen = async (requestIds: string[]) => {
        try {
            const response = await fetch(`${BASE_URL}/notification-update/request-seen`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: requestIds
                })
            });
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            }
        }
    }

    const openDeleteDialogue = (sheetId: string) => {
        setDeletingRequestId(sheetId)
        setShowDeleteDialog(true)
    }

    const openHaltDialogue = (sheetId: string) => {
        setHaltingRequestId(sheetId)
        setShowHaltDialog(true)
    }

    const handleDelete = async (message: string) => {
        try {
            let response = await fetch(`${BASE_URL}/fuel-request/${deletingRequestId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });
            if (!response.ok) {
                throw new Error('Failed to delete');
            }
            setShowSuccessAlert(true);
            setData(data.filter(request => request._id !== deletingRequestId));
        } catch (error) {
            console.error(error);
            setError(String(error));
            setShowErrorAlert(true);
        } finally {
            setShowDeleteDialog(false);
        }
    };

    const handleHalt = async (message: string) => {
        try {
            let response = await fetch(`${BASE_URL}/fuel-request/hold-message/${haltingRequestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });
            if (!response.ok) {
                throw new Error('Failed to delete');
            }
            setShowSuccessAlert(true);
            // setData(data.filter(request => request._id !== haltingRequestId));
        } catch (error) {
            console.error(error);
            setError(String(error));
            setShowErrorAlert(true);
        } finally {
            setShowDeleteDialog(false);
        }
    };
    const handleClearHistory = async () => {
        try {
            let response = await fetch(`${BASE_URL}/fuel-request/bulk-delete`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: data.map(request => request._id)
                })
            });
            if (!response.ok) {
                throw new Error('Failed to delete');
            }
            alert('All requests deleted successfully\nReloading to check for other requests');
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
            <Button variant="destructive" size="lg" className='w-full md:max-w-lg mt-6 block mx-auto' onClick={() => {
                if (confirm('Are you sure you want to clear all the visible previous fuel requests?')) {
                    handleClearHistory();
                }
            }}>Clear All</Button>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-8">
                {data?.length && data.length > 0 ? data.map((request, index) => (
                    <Card key={index}>
                        <CardHeader>
                            <CardTitle>{request.vehicleNumber}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Odometer: {request.odometer}
                            <br />
                            Load Status: {request.loadStatus}
                            <br />
                            Capacity/ KL: {request.capacity}
                            <br />
                            Trip: {request.trip}
                            <br />
                            Strart Date: {formatDate(request.startDate)}
                            <br />
                            Trip Status: {request.tripStatus}
                            <br />
                            Driver Name: {request.driverName}
                            <br />
                            Driver Id: {request.driverId}
                            <br />
                            Driver Mobile No.: <Link className='text-blue-500 visited:text-purple-500' href={`tel:${request.driverMobile}`}>{request.driverMobile}</Link>
                            <br />
                            Request Time: {formatDate(request.createdAt)}
                            <br />
                            Location:  <span className='inline-flex gap-1 justify-end'><MapPin size={20} /> <Link className='text-blue-500' href={`https://www.google.com/maps?q=${request.location}`}>{request.location}</Link></span>
                        </CardContent>
                        <CardFooter>
                            <div className='flex flex-row flex-wrap justify-between items-center w-full'>
                                <Button variant="destructive" size="lg" onClick={() => openDeleteDialogue(request._id!)}>Reject</Button>
                                <Button size="lg" onClick={() => openHaltDialogue(request._id!)}>Halt</Button>
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
                                                    odoMeter: request.odometer,
                                                    tripId: request.tripId,
                                                    driverId: request.driverId,
                                                    driverName: request.driverName,
                                                    driverMobile: request.driverMobile,
                                                    allocationType: "bowser"
                                                }
                                            }} >
                                                <Button variant="default" className='w-full' size="lg">By Bowser</Button>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Link className='w-full' type='button' href={{
                                                pathname: "dashboard", query: {
                                                    id: request._id,
                                                    vehicleNumber: request.vehicleNumber,
                                                    odoMeter: request.odometer,
                                                    tripId: request.tripId,
                                                    driverId: request.driverId,
                                                    driverName: request.driverName,
                                                    driverMobile: request.driverMobile,
                                                    allocationType: "external"
                                                }
                                            }} >
                                                <Button variant="default" className='w-full' size="lg">By Petrol Pump</Button>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Link className='w-full' type='button' href={{
                                                pathname: "dashboard", query: {
                                                    id: request._id,
                                                    vehicleNumber: request.vehicleNumber,
                                                    odoMeter: request.odometer,
                                                    tripId: request.tripId,
                                                    driverId: request.driverId,
                                                    driverName: request.driverName,
                                                    driverMobile: request.driverMobile,
                                                    allocationType: "internal"
                                                }
                                            }} >
                                                <Button variant="default" className='w-full' size="lg">From Office</Button>
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
                        <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to Reject this fuel request? This action cannot be undone.
                            <Input value={deleteMessage} type="text" onChange={(e) => setDeleteMessage(e.target.value)} placeholder='Enter reason for Rejection.' className='mt-3 text-foreground placeholder:text-gray-400' />
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => handleDelete(deleteMessage)} disabled={deleteMessage?.length < 5}>Reject</AlertDialogAction>
                    <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={showHaltDialog} onOpenChange={setShowHaltDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Helt/ Hold</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter the message to notify the driver/ halt reason
                            <Input value={haltMessage} type="text" onChange={(e) => setHaltMessage(e.target.value)} placeholder='Enter reason for Hold/Halt.' className='mt-3 text-foreground placeholder:text-gray-400' />
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => handleHalt(haltMessage)} disabled={haltMessage?.length < 3}>Submit</AlertDialogAction>
                    <AlertDialogCancel onClick={() => setShowHaltDialog(false)}>Cancel</AlertDialogCancel>
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
                        <AlertDialogContent className='bg-red-600 text-foreground'>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Error</AlertDialogTitle>
                                <AlertDialogDescription className='text-foreground'>
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