import Loading from '@/app/loading';
import { BASE_URL } from '@/lib/api'
import { TankersTrip, TransAppUser, TripsSummary } from '@/types'
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDate } from '@/lib/utils';
import { generateTripsReport } from "@/utils/excel";
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

type TripBase = {
    _id: string;
    LoadStatus: number;
    StartDate: string;
    targetTime: string;
    StartDriver: string;
    StartDriverMobile: string;
    LoadTripDetail: {
        LoadDate: string;
        SupplyFrom: string;
        ShipTo: string;
        NameOfGoods: string;
        LoadDetail: {
            LoadQty: number;
            UnloadQty: number;
            ShortQty: number;
        };
        UnloadDate: string
        ReportDate: string
    };
    TravelHistory: {
        TrackUpdateDate: Date;
        LocationOnTrackUpdate: string;
        OdometerOnTrackUpdate: number;
        ManagerComment: string;
        Driver: string;
    }[];
    VehicleNo: string;
    StartFrom?: string;
    EndTo: string;
    superwiser?: string;
};

type LoadedTrip = TripBase & {
    TallyLoadDetail?: {
        Consignor: string;
        ReportedDate: string;
    };
};

type EmptyTrip = TripBase & {
    EmptyTripDetail?: {
        ReportDate: string;
    };
};

type TripStatus = "On Way" | "Reported" | "Standing" | "In Distillery" | "Loaded" | "Unloaded";

type GroupedTrip = (LoadedTrip | EmptyTrip) & {
    status: TripStatus;
};

type TripData = {
    onWay?: { count: number; trips: (LoadedTrip | EmptyTrip)[] };
    reported?: { count: number; trips: (LoadedTrip | EmptyTrip)[] };
    standing?: { count: number; trips: (LoadedTrip | EmptyTrip)[] };
};

type VehicleData = {
    loaded?: TripData;
    empty?: TripData;
};

type Props = {
    data: VehicleData;
    setSelectedTripId: (id: string) => void;
};


const VehiclesSummary = () => {
    const [user, setUser] = useState<TransAppUser>();
    const [loading, setLoading] = useState<boolean>(true)
    const [data, setData] = useState<TripsSummary>();
    const [visibleData, setVisibleData] = useState<TripsSummary>();
    const [filter, setFilter] = useState<'all' | 'loadedOnWay' | 'loadedReported' | 'emptyOnWay' | 'emptyReported' | 'emptyStanding'>('all')
    const [selectedTripId, setSelectedTripId] = useState<string>()
    const [selectedTrip, setSelectedTrip] = useState<TankersTrip>()

    useEffect(() => {
        setVisibleData(data)
    }, [data])

    useEffect(() => {
        let user = localStorage.getItem("adminUser")
        let jsonUser: TransAppUser = JSON.parse(user!)
        setUser(jsonUser)
    }, [])

    const fetchSummary = async () => {
        if (!user?._id) return
        try {
            setLoading(true)
            const url = `${BASE_URL}/trans-app/vehicles/get-summary/${user?._id}?isAdmin${user?.Division === "EthanolAdmin"}`
            const summary = await fetch(url);
            const jsonSummary = await summary.json()
            setData(jsonSummary);
        } catch (error) {
            console.error(error)
            toast.error("Error", { description: String(error), richColors: true })
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        fetchSummary()
    }, [user?._id])

    const handleDownload = () => {
        generateTripsReport({
            summary: data!,
            username: user!.name,
            isAdmin: user?.Division === "EthanolAdmin",
            fileName: `Tankers_Report_Generated_at_${formatDate(new Date())}_by_${user?.name}.xlsx`,
        });
    };

    const findTripById = () => {
        const allTrips = [
            ...(data?.loaded?.onWay?.trips ?? []),
            ...(data?.loaded?.reported?.trips ?? []),
            ...(data?.empty?.onWay?.trips ?? []),
            ...(data?.empty?.standing?.trips ?? []),
            ...(data?.empty?.reported?.trips ?? [])
        ];

        const trip = allTrips.find(trip => trip._id === selectedTripId);
        setSelectedTrip(trip)
    }

    useEffect(() => {
        findTripById()
    }, [selectedTripId])

    function groupTripsByEndTo(data: TripData | undefined, type: "loaded" | "empty") {
        const grouped: Record<string, GroupedTrip[]> = {};

        if (!data) return grouped;

        const statuses: { key: keyof TripData; label: TripStatus }[] = [
            { key: "onWay", label: "On Way" },
            { key: "reported", label: "Reported" },
            { key: "standing", label: "Standing" },
        ];

        statuses.forEach(({ key, label }) => {
            const statusData = data[key];
            if (statusData?.trips?.length) {
                statusData.trips.forEach((trip) => {
                    const endTo = trip.EndTo || "Unknown";
                    if (!grouped[endTo]) grouped[endTo] = [];

                    grouped[endTo].push({
                        ...trip,
                        status: label,
                    });
                });
            }
        });

        // 1. Get the keys (EndTo values) from the grouped object
        const sortedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b)); // Sort alphabetically.

        // 2. Create a new object to store the sorted grouped data
        const sortedGrouped: Record<string, GroupedTrip[]> = {};

        // 3. Iterate over the sorted keys and populate the new object
        sortedKeys.forEach((key) => {
            sortedGrouped[key] = grouped[key];
        });

        return sortedGrouped;
    }

    function getStatusOptions(type: "loaded" | "empty", currentStatus: TripStatus): TripStatus[] {
        const statusMap: Record<"loaded" | "empty", TripStatus[]> = {
            loaded: ["On Way", "Reported", "In Distillery", "Unloaded"],
            empty: ["On Way", "Standing", "Reported", "In Distillery", "Loaded"],
        };

        return statusMap[type].filter((status) => status !== currentStatus);
    }

    return (
        <>
            {loading && <Loading />}
            {data &&
                <div className='my-8'>
                    <div className='w-full flex justify-end mb-3'>
                        <Button onClick={() => handleDownload()}>Download Report</Button>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                        <Card>
                            <CardHeader>
                                <CardTitle>Loaded Vehicles {data?.loaded?.onWay.count + data?.loaded?.reported.count}</CardTitle>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-2'>
                                <Button variant="outline" className='w-40' onClick={() => setFilter('loadedOnWay')}>
                                    <strong>On Way: </strong><span>{data?.loaded?.onWay.count}</span>
                                </Button>
                                <Button variant="outline" className='w-40' onClick={() => setFilter('loadedReported')}>
                                    <strong>Reported: </strong><span>{data?.loaded?.reported.count}</span>
                                </Button>
                            </CardContent>
                            <CardFooter></CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Empty Vehicles {data?.empty?.onWay.count + data?.empty?.reported.count + data?.empty?.standing.count}</CardTitle>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-2'>
                                <Button variant="outline" className='w-40' onClick={() => setFilter('emptyOnWay')}>
                                    <strong>On Way: </strong>{data?.empty?.onWay.count}
                                </Button>
                                <Button variant="outline" className='w-40' onClick={() => setFilter('emptyStanding')}>
                                    <strong>Standing: </strong>{data?.empty?.standing.count}
                                </Button>
                                <Button variant="outline" className='w-40' onClick={() => setFilter('emptyReported')}>
                                    <strong>Reported: </strong> {data?.empty?.reported.count}
                                </Button>
                            </CardContent>
                            <CardFooter></CardFooter>
                        </Card>
                        <Button variant="outline" className='w-max' onClick={() => setFilter('all')}>View All Vehicles</Button>
                    </div>
                    <div className='my-4'>
                        <Accordion type="single" collapsible defaultValue="loaded" className="mb-2 p-4 w-full">
                            {/* Loaded Vehicles */}
                            <AccordionItem value="loaded">
                                <AccordionTrigger className="text-lg font-semibold">Loaded Vehicles</AccordionTrigger>
                                <AccordionContent>
                                    {Object.entries(groupTripsByEndTo(data.loaded, "loaded")).map(([endTo, trips]) => (
                                        <Card key={endTo} className="mb-4">
                                            <CardHeader className="font-semibold text-md">{endTo}</CardHeader>
                                            <CardContent>
                                                <Table className="w-full">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Vehicle No</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Superviser</TableHead>
                                                            {user?.Division.includes('Admin') && <TableHead>Action</TableHead>}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {trips.map((trip) => (
                                                            <TableRow className={selectedTripId === trip._id ? "bg-green-300" : ""} key={trip._id} onClick={() => setSelectedTripId(trip._id)}>
                                                                <TableCell>{trip.VehicleNo}</TableCell>
                                                                <TableCell>{trip.status}</TableCell>
                                                                <TableCell>{trip.superwiser}</TableCell>
                                                                {user?.Division.includes('Admin') && <TableCell>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button disabled variant="outline" size="sm">
                                                                                Update
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent>
                                                                            {getStatusOptions("loaded", trip.status).map((statusOption) => (
                                                                                <DropdownMenuItem key={statusOption}>
                                                                                    {statusOption}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </TableCell>}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>

                            {/* Empty Vehicles */}
                            <AccordionItem value="empty">
                                <AccordionTrigger className="text-lg font-semibold">Empty Vehicles</AccordionTrigger>
                                <AccordionContent>
                                    {Object.entries(groupTripsByEndTo(data.empty, "empty")).map(([endTo, trips]) => (
                                        <Card key={endTo} className="mb-4">
                                            <CardHeader className="font-semibold text-md">{endTo}</CardHeader>
                                            <CardContent>
                                                <Table className="w-full">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Vehicle No</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Superviser</TableHead>
                                                            {user?.Division.includes('Admin') && <TableHead>Action</TableHead>}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {trips.map((trip) => (
                                                            <TableRow className={selectedTripId === trip._id ? "bg-green-300" : ""} key={trip._id} onClick={() => setSelectedTripId(trip._id)}>
                                                                <TableCell>{trip.VehicleNo}</TableCell>
                                                                <TableCell>{trip.status === "Standing" ? "Not Programmed" : trip.status}</TableCell>
                                                                <TableCell>{trip.superwiser}</TableCell>
                                                                {user?.Division.includes('Admin') && <TableCell>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button disabled variant="outline" size="sm">
                                                                                Update
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent>
                                                                            {getStatusOptions("empty", trip.status).map((statusOption) => (
                                                                                <DropdownMenuItem key={statusOption}>
                                                                                    {statusOption}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </TableCell>}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div >
            }
        </>
    )
}

export default VehiclesSummary
