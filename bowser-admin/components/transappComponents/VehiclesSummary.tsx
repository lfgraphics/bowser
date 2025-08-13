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

const VehiclesSummary = () => {
    const [user, setUser] = useState<TransAppUser>();
    const [loading, setLoading] = useState<boolean>(true)
    const [data, setData] = useState<TripsSummary>();
    const [selectedTripId, setSelectedTripId] = useState<string>()
    const [selectedTrip, setSelectedTrip] = useState<TankersTrip>()

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
                            <CardContent>
                                <strong>On Way: </strong>{data?.loaded?.onWay.count}
                                <br />
                                <strong>Reported: </strong> {data?.loaded?.reported.count}
                            </CardContent>
                            <CardFooter></CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Empty Vehicles {data?.empty?.onWay.count + data?.empty?.reported.count + data?.empty?.standing.count}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <strong>On Way: </strong>{data?.empty?.onWay.count}
                                <br />
                                <strong>Standing: </strong>{data?.empty?.standing.count}
                                <br />
                                <strong>Reported: </strong> {data?.empty?.reported.count}
                            </CardContent>
                            <CardFooter></CardFooter>
                        </Card>
                    </div>
                    <div className='my-4'>
                        <Accordion type="single" collapsible defaultValue='loadedOnWay' className="mb-2 p-4 w-full">
                            <h1 className='text-lg font-semibold my-4'>Loaded Vehicles</h1>
                            {data?.loaded?.onWay.count > 0 &&
                                <AccordionItem value="loadedOnWay">
                                    <AccordionTrigger className="mb-2 w-full text-left">On Way</AccordionTrigger>
                                    <AccordionContent>
                                        <Table className="w-max min-w-full">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Sr No.</TableHead>
                                                    <TableHead>Vehicle No</TableHead>
                                                    <TableHead>Route</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data?.loaded?.onWay.trips.map((trip, index) =>
                                                    <TableRow onClick={() => setSelectedTripId(trip._id)} key={index}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell>{trip.VehicleNo}</TableCell>
                                                        <TableCell>{trip.StartFrom + " - " + trip.EndTo}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            }
                            {data?.loaded?.reported.count > 0 &&
                                <AccordionItem value="loadedReported">
                                    <AccordionTrigger className="mb-2 w-full text-left">Reported</AccordionTrigger>
                                    <AccordionContent>
                                        <Table className="w-max min-w-full">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Sr No.</TableHead>
                                                    <TableHead>Vehicle No</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead>Reporting Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data?.loaded?.reported.trips.map((trip, index) =>
                                                    <TableRow onClick={() => setSelectedTripId(trip._id)} key={index}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell>{trip.VehicleNo}</TableCell>
                                                        <TableCell>{trip.TallyLoadDetail.Consignor + ": " + trip.EndTo}</TableCell>
                                                        <TableCell>{formatDate(trip.TallyLoadDetail.ReportedDate)}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            }
                            <h1 className='text-lg font-semibold'>Empty Vehicles</h1>
                            {data?.empty?.onWay.count > 0 &&
                                <AccordionItem value="emptyOnway">
                                    <AccordionTrigger className="mb-2 w-full text-left">On Way</AccordionTrigger>
                                    <AccordionContent>
                                        <Table className="w-max min-w-full">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Sr No.</TableHead>
                                                    <TableHead>Vehicle No</TableHead>
                                                    <TableHead>Route</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data?.empty?.onWay.trips.map((trip, index) =>
                                                    <TableRow onClick={() => setSelectedTripId(trip._id)} key={index}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell>{trip.VehicleNo}</TableCell>
                                                        <TableCell>{trip.StartFrom + " - " + trip.EndTo}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            }
                            {data?.empty?.standing.count > 0 &&
                                <AccordionItem value="emptyStanding">
                                    <AccordionTrigger className="mb-2 w-full text-left">Standing</AccordionTrigger>
                                    <AccordionContent>
                                        <Table className="w-max min-w-full">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Sr No.</TableHead>
                                                    <TableHead>Vehicle No</TableHead>
                                                    <TableHead>Location</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data?.empty?.standing.trips.map((trip, index) =>
                                                    <TableRow onClick={() => setSelectedTripId(trip._id)} key={index}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell>{trip.VehicleNo}</TableCell>
                                                        <TableCell>{trip.EndTo}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            }
                            {data?.empty?.reported.count > 0 &&
                                <AccordionItem value="emptyReported">
                                    <AccordionTrigger className="mb-2 w-full text-left">Reported</AccordionTrigger>
                                    <AccordionContent>
                                        <Table className="w-max min-w-full">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Sr No.</TableHead>
                                                    <TableHead>Vehicle No</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead>Reporting Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data?.empty?.reported.trips.map((trip, index) =>
                                                    <TableRow onClick={() => setSelectedTripId(trip._id)} key={index}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell>{trip.VehicleNo}</TableCell>
                                                        <TableCell>{trip.EndTo}</TableCell>
                                                        <TableCell>{formatDate(trip.EmptyTripDetail.ReportDate)}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            }
                        </Accordion>
                    </div>
                    {selectedTrip &&
                        <Card>
                            <CardHeader>
                                <CardTitle>{selectedTrip.VehicleNo}</CardTitle>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-4'>
                                {/* <span>Load Status: {selectedTrip.LoadStatus === 0 ? "Empty" : "Loaded"}</span> */}
                                <span>Departed From: {selectedTrip.StartFrom} @ {formatDate(selectedTrip.StartDate)}</span>
                                <span>To: {selectedTrip.EndTo} {formatDate(selectedTrip.EmptyTripDetail?.ReportDate || selectedTrip.EmptyTripDetail?.ReportDate || null).length > 1 ? "@" : ""} {formatDate(selectedTrip.EmptyTripDetail?.ReportDate || selectedTrip.EmptyTripDetail?.ReportDate || null)}</span>
                                {selectedTrip.TravelHistory && selectedTrip.TravelHistory.length > 0 &&
                                    <>
                                        <h4 className='text-lg font-semibold'>Travel History</h4>
                                        <Table className="w-max min-w-full">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Update</TableHead>
                                                    <TableHead>Driver</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead>Odometer</TableHead>
                                                    <TableHead>Comment</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedTrip.TravelHistory?.map((history, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            {(history.ManagerComment.match(/#(\w+)/) || ["", "UPDATE"])[1] + " on " + formatDate(history.TrackUpdateDate)}
                                                        </TableCell>
                                                        <TableCell>{history.Driver}</TableCell>
                                                        <TableCell>{history.LocationOnTrackUpdate}</TableCell>
                                                        <TableCell>{history.OdometerOnTrackUpdate}</TableCell>
                                                        <TableCell>{history.ManagerComment}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </>
                                }
                            </CardContent>
                        </Card>
                    }
                </div >
            }
        </>
    )
}

export default VehiclesSummary
