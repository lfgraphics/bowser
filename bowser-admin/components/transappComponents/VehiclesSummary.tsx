import Loading from '@/app/loading';
import { BASE_URL } from '@/lib/api'
import { TransAppUser, TripsSummary } from '@/types'
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const VehiclesSummary = () => {
    const [userId, setUserId] = useState<string>();
    const [loading, setLoading] = useState<boolean>(false)
    const [data, setData] = useState<TripsSummary>();
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleAccordion = (index: number) => {
        setOpenIndex((prevIndex) => (prevIndex === index ? null : index));
    };

    useEffect(() => {
        let user = localStorage.getItem("adminUser")
        let jsonUser: TransAppUser = JSON.parse(user!)
        setUserId(jsonUser._id)
    }, [])
    const fetchSummary = async () => {
        if (!userId) return
        try {
            setLoading(true)
            const url = `${BASE_URL}/trans-app/vehicles/get-summary/${userId}`
            const summary = await fetch(url);
            const jsonSummary = await summary.json()
            // console.log('summary: ', jsonSummary);
            setData(jsonSummary);
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        fetchSummary()
    }, [userId])
    return (
        <>
            {loading && <Loading />}
            {data &&
                <div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                        <Card>
                            <CardHeader>
                                <CardTitle>Loaded Vehicles {data.loaded.onWay.count + data.loaded.reported.count}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <strong>On Way: </strong>{data.loaded.onWay.count}
                                <br />
                                <strong>Reported: </strong> {data.loaded.reported.count}
                            </CardContent>
                            <CardFooter></CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Empty Vehicles {data.empty.onWay.count + data.empty.reported.count + data.empty.standing.count}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <strong>On Way: </strong>{data.empty.onWay.count}
                                <br />
                                <strong>Standing: </strong>{data.empty.standing.count}
                                <br />
                                <strong>Reported: </strong> {data.empty.reported.count}
                            </CardContent>
                            <CardFooter></CardFooter>
                        </Card>
                    </div>
                    <div className='my-4'>
                        <h1 className='text-lg font-semibold'>Loaded Vehicles</h1>
                        <Accordion type="single" collapsible defaultValue='loadedOnWay' className="mb-2 p-4 w-full">
                            <AccordionItem value="loadedOnWay">
                                <AccordionTrigger className="mb-2 w-full text-left">On Way</AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="loadedReported">
                                <AccordionTrigger className="mb-2 w-full text-left">Reported</AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        <h1 className='text-lg font-semibold'>Empty Vehicles</h1>
                        <Accordion type="single" collapsible defaultValue='' className="mb-2 p-4 w-full">
                            <AccordionItem value="emptyOnway">
                                <AccordionTrigger className="mb-2 w-full text-left">On Way</AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="emptyStanding">
                                <AccordionTrigger className="mb-2 w-full text-left">Standing</AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="emptyReported">
                                <AccordionTrigger className="mb-2 w-full text-left">Reported</AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            }
        </>
    )
}

export default VehiclesSummary
