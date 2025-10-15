"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, MapPin, User, Calendar, Clock, RefreshCw, Phone } from 'lucide-react';
import Link from 'next/link';

interface VehicleTrip {
    vehicleNumber: string;
    driverName?: string;
    driverPhone?: string;
    StartFrom: string;
    EndTo: string;
    StartDate: string;
    EndDate?: string;
    loadStatus: string;
    status: string;
    isEnded?: boolean;
}

interface DashboardData {
    success: boolean;
    count: number;
    data: VehicleTrip[];
    userLocations: string[];
}

const VehicleCard: React.FC<{ vehicle: VehicleTrip }> = ({ vehicle }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'ongoing': return 'bg-blue-500';
            case 'completed': return 'bg-green-500';
            case 'pending': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const getLoadStatusColor = (loadStatus: string) => {
        switch (loadStatus?.toLowerCase()) {
            case 'loaded': return 'bg-orange-500';
            case 'empty': return 'bg-gray-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Truck className="h-5 w-5 text-blue-600" />
                        <span className="text-lg font-bold">{vehicle.vehicleNumber}</span>
                    </div>
                    <div className="flex space-x-2">
                        <Badge className={`${getLoadStatusColor(vehicle.loadStatus)} text-white`}>
                            {vehicle.loadStatus || 'Unknown'}
                        </Badge>
                        <Badge className={`${getStatusColor(vehicle.status)} text-white`}>
                            {vehicle.status || 'Unknown'}
                        </Badge>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Route Information */}
                <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-green-500" />
                        <span className="font-medium">From:</span>
                        <span>{vehicle.StartFrom}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <span className="font-medium">To:</span>
                        <span>{vehicle.EndTo.split(':')[1] || vehicle.EndTo.split(':')[0]}</span>
                    </div>
                </div>

                {/* Date Information */}
                <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Start:</span>
                        <span>{formatDate(vehicle.StartDate)}</span>
                    </div>
                    {vehicle.EndDate && (
                        <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">End:</span>
                            <span>{formatDate(vehicle.EndDate)}</span>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className='flex justify-between items-end'>
                {vehicle.driverName && (
                    <div className="flex items-center flex-wrap space-x-2 text-sm">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{vehicle.driverName}</span>
                        {vehicle.driverPhone && (
                            <span className="text-gray-500">({vehicle.driverPhone})</span>
                        )}
                    </div>
                )}
                {vehicle.driverPhone && vehicle.driverPhone !== "N/A" && (
                    <Link href={`tel:${vehicle.driverPhone}`} className="text-blue-500 hover:underline">
                        <Button>
                            <Phone />
                        </Button>
                    </Link>
                )}
            </CardFooter>
        </Card>
    );
};

const CampDashboard = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/camp/vehicles/dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const dashboardData: DashboardData = await response.json();
            setData(dashboardData);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
                <div className="flex items-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading dashboard data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold">Camp Dashboard</h1>
                <Button onClick={fetchDashboardData} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {error && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            {data && (
                <>
                    {/* Summary Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-2">
                                    <Truck className="h-8 w-8 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Total Vehicles</p>
                                        <p className="text-2xl font-bold">{data.count}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-2">
                                    <MapPin className="h-8 w-8 text-green-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Your Locations</p>
                                        <p className="text-2xl font-bold">{data.userLocations.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-2">
                                    <Truck className="h-8 w-8 text-orange-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Loaded Vehicles</p>
                                        <p className="text-2xl font-bold">
                                            {data.data.filter(vehicle => vehicle.loadStatus?.toLowerCase() === 'loaded').length}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Locations List */}
                    {data.userLocations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Locations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {data.userLocations.map((location, index) => (
                                        <Badge key={index} variant="outline">
                                            {location}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Vehicles Grid */}
                    <div>
                        <h2 className="text-2xl font-semibold mb-2">Vehicle Status at Your Locations</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Showing running trips (ongoing) or latest completed trips for each vehicle at your assigned locations
                        </p>
                        {data.data.length === 0 ? (
                            <Card>
                                <CardContent className="pt-6 text-center">
                                    <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No vehicles found at your locations</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data.data.filter(vehicle => !vehicle.isEnded).sort((a, b) => new Date(b.StartDate).getMilliseconds() - new Date(a.StartDate).getMilliseconds()).sort((a,b)=>a.vehicleNumber.localeCompare(b.vehicleNumber)).map((vehicle, index) => (
                                    <VehicleCard key={`${vehicle.vehicleNumber}-${index}`} vehicle={vehicle} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CampDashboard;
