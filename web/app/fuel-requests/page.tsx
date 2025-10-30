"use client";
import { BASE_URL } from '@/lib/api';
import { FuelRequest } from '@/types';
import React, { useEffect, useState } from 'react';
import Loading from '../loading';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogContent, AlertDialogAction } from '@/components/ui/alert-dialog';
import { formatDate } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { User } from '@/types/auth';
import { isAuthenticated } from '@/lib/auth';
import { Check, MapPin, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';

const page = ({ params }: { params: { manager: string } }) => {
    const [loading, setLoading] = useState(false);
    const [allocators, setAllocators] = useState<{ name: string; userId: string }[]>([]);
    const [selectedAllocator, setSelectedAllocator] = useState<string | undefined>(undefined);
    const [data, setData] = useState<FuelRequest[] | []>([]);
    const [error, setError] = useState<string | null>(null);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
    const [user, setUser] = useState<User>();
    const [filters, setFilters] = useState({ param: '', fulfilled: '', page: 1, limit: 20, manager: '' });
    const [pagination, setPagination] = useState({ totalRecords: 0, totalPages: 0, currentPage: 1 });

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
        if (user && (user.roles[0] !== 'Admin' && user.roles[1] !== 'Admin')) {
            window.history.back();
        }
    };

    useEffect(() => {
        checkAuth();
        const storedUser = localStorage.getItem('adminUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        if (!user?.userId) return;
        fetchFuelRequests();
    }, [user, filters, selectedAllocator]);

    useEffect(() => {
        fetchAllocators();
    }, []);

    useEffect(() => {
        setFilters((prev) => ({ ...prev, manager: selectedAllocator || '' }));
    }, [selectedAllocator]);

    const fetchAllocators = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/users/allocators`);
            setAllocators(response.data);
        } catch (error) {
            console.error("Error fetching Vehicle Managers:", error);
        }
    };

    const fetchFuelRequests = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams(filters as any).toString();
            console.log('Query: ',query);
            const response = await fetch(`${BASE_URL}/fuel-request?${query}`);
            const result = await response.json();
            setData(result.requests);
            setPagination(result.pagination);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
    };

    return (
        <>
            <div className="filter-section my-6 flex flex-col md:flex-row items-center justify-between gap-2">
                <Input
                    name="param"
                    placeholder="Search by vehicle, driver, etc."
                    value={filters.param}
                    onChange={handleFilterChange}
                    className="mr-2"
                />
                <Select onValueChange={(value) => setSelectedAllocator(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Vehicle Manager" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value=" ">All Vehicle Managers</SelectItem>
                        {allocators.map((allocator) => (
                            <SelectItem key={allocator.userId} value={allocator.userId}>
                                {allocator.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select name="fulfilled" value={filters.fulfilled} onValueChange={(value) => handleFilterChange({ target: { name: 'fulfilled', value } } as any)}>
                    <SelectTrigger className="w-full mr-2">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="undefined">All</SelectItem>
                        <SelectItem value="true">Fulfilled</SelectItem>
                        <SelectItem value="false">Not Fulfilled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading && <Loading />}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sr.</TableHead>
                            <TableHead>Vehicle Number</TableHead>
                            <TableHead>Manager</TableHead>
                            <TableHead>Trip</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Trip Status</TableHead>
                            <TableHead>Driver Details</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Request Time</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.length > 0 ? (
                            data.map((request, index) => (
                                <TableRow key={index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{request.vehicleNumber}</TableCell>
                                    <TableCell>{request.manager}</TableCell>
                                    <TableCell>{request.trip}</TableCell>
                                    <TableCell>{formatDate(request.startDate)}</TableCell>
                                    <TableCell>{request.tripStatus}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p>Name: {request.driverName}</p>
                                            <p>ID: {request.driverId}</p>
                                            <p>
                                                Mobile:{' '}
                                                <Link
                                                    className="text-blue-500 hover:underline"
                                                    href={`tel:${request.driverMobile}`}
                                                >
                                                    {request.driverMobile}
                                                </Link>
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin size={16} />
                                            <Link
                                                className="text-blue-500 hover:underline"
                                                href={`https://www.google.com/maps?q=${request.location}`}
                                            >
                                                {request.location}
                                            </Link>
                                        </span>
                                    </TableCell>
                                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                                    <TableCell>
                                        {request.fulfilled ? (
                                            <Check className="text-green-500" />
                                        ) : (
                                            <X className="text-red-500" />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            !loading && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center">
                                        <Loading />
                                    </TableCell>
                                </TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="pagination mt-4 flex justify-center">
                <Button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                >
                    Previous
                </Button>
                <span className="mx-4">
                    Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                >
                    Next
                </Button>
            </div>

            {error && (
                <AlertDialog open={showErrorAlert} onOpenChange={setShowErrorAlert}>
                    <AlertDialogContent className="bg-red-600 text-foreground">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Error</AlertDialogTitle>
                            <AlertDialogDescription className="text-foreground">
                                {String(error)}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogAction onClick={() => setShowErrorAlert(false)}>Close</AlertDialogAction>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
};

export default page;