'use client';
import Loading from '@/app/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { BowserTrips } from '@/types';
import { Check, X } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect } from 'react'

const page = ({ params }: { params: Promise<{ bowserNumber: string }> }) => {
    const [bowserNumber, setBowserNumber] = React.useState<string>("");
    useEffect(() => {
        (async () => {
            const { bowserNumber } = await params;
            setBowserNumber(bowserNumber);
        })();
    }, [params]);
    const [bowserTrips, setBowserTrips] = React.useState<BowserTrips[]>([])
    const [loading, setLoading] = React.useState<boolean>(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const respnse = await fetch(`${BASE_URL}/bowsers/trips/${bowserNumber}`, {
                method: 'GET'
            }
            )
            if (!respnse.ok) {
                throw new Error('Network response was not ok')
            }
            const data: BowserTrips[] = await respnse.json()
            setBowserTrips(data)
        }
        catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (bowserNumber) {
            fetchData()
        }
    }, [bowserNumber])

    return (
        <div>
            {loading && <Loading />}
            {bowserTrips && bowserTrips.length > 0 &&
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sr No.</TableHead>
                            <TableHead>TripSheet No.</TableHead>
                            <TableHead>Created on</TableHead>
                            <TableHead>Setteled on</TableHead>
                            <TableHead>Opening Qty</TableHead>
                            <TableHead>Closing Qty</TableHead>
                            <TableHead>Diffrence Reason (if any)</TableHead>
                            <TableHead>Load Qty</TableHead>
                            <TableHead>Sale Qty</TableHead>
                            <TableHead>Balance Qty</TableHead>
                            <TableHead>Excess/(Short)</TableHead>
                            <TableHead>Post Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bowserTrips.map((trip, index) => {
                            const ch1Openingqty = Number(trip.loading.sheetId?.chamberwiseDipListBefore?.find((chamber) => chamber.chamberId === "Chamber-1")?.qty.toFixed(2))
                            const ch2Openingqty = Number(trip.loading.sheetId?.chamberwiseDipListBefore.find((chamber) => chamber.chamberId === "Chamber-2")?.qty.toFixed(2))
                            const totalOpeningQty = Number((ch1Openingqty + ch2Openingqty).toFixed(2))
                            const loadQty = Number(trip.loading.quantityBySlip.toFixed(2)) || 0
                            const addition = trip.totalAdditionQty || 0
                            const ch1qty = Number(trip.settelment?.details?.chamberwiseDipList.find((chamber) => chamber.chamberId === "Chamber-1")?.qty.toFixed(2)) || 0
                            const ch2qty = Number(trip.settelment?.details?.chamberwiseDipList.find((chamber) => chamber.chamberId === "Chamber-2")?.qty.toFixed(2)) || 0
                            const totalLoadQty = totalOpeningQty + loadQty + addition
                            const totalClosingQty = Number((ch1qty + ch2qty).toFixed(2))
                            const saleAsPerDriver = trip.saleQty
                            const saleAsPerLoad = totalLoadQty - totalClosingQty
                            const unload = trip.settelment?.details.extras?.unload || 0
                            const shortExcess = Number((saleAsPerDriver - saleAsPerLoad + unload).toFixed(2))

                            return (
                                <TableRow key={index} >
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{<Link href={`/tripsheets/${trip._id}`} className='text-blue-500 underline'>{trip.tripSheetId}</Link>}</TableCell>
                                    <TableCell>{formatDate(trip.createdAt)}</TableCell>
                                    <TableCell>{trip.settelment && formatDate(trip.settelment.dateTime)}</TableCell>
                                    <TableCell>{(trip.loading.sheetId.chamberwiseDipListBefore.reduce((total, chamber) => total + chamber.qty, 0)).toFixed(2)}</TableCell>
                                    <TableCell>{(trip.settelment?.details.chamberwiseDipList.reduce((total, chamber) => total + chamber.qty, 0))?.toFixed(2)}</TableCell>
                                    <TableCell>{trip.loading.sheetId.changeInOpeningDip && trip.loading.sheetId.changeInOpeningDip.reason + ": " + trip.loading.sheetId.changeInOpeningDip.remarks || trip.closure && trip.closure.details.reason + ": " + trip.closure.details.remarks}</TableCell>
                                    <TableCell>{(trip.totalLoadQuantityBySlip).toFixed(2)}</TableCell>
                                    <TableCell>{(trip.saleQty).toFixed(2)}</TableCell>
                                    <TableCell>{(trip.balanceQtyBySlip).toFixed(2)}</TableCell>
                                    <TableCell>{shortExcess} Lt.</TableCell>
                                    <TableCell>{trip.saleQty && trip.saleQty > 0 ? trip.posted ? <Check className='text-green-500 block mx-auto' /> : <X className='text-red-500 block mx-auto' /> : null}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            }
        </div >
    )
}

export default page
