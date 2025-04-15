"use client";
import Loading from '@/app/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BASE_URL } from '@/lib/api';
import { WholeTripSheet } from '@/types';
import { createTallyPostableXML } from '@/utils/post';
import { postToTally } from '@/utils/tally';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

const page = ({ params }: { params: { id: string } }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [entryVoucher, setEntryVoucher] = useState('Bio-Diesel Filling-ITPL')
    const [entryStock, setEntryStock] = useState('Blended Bio Diesel')
    const [entryGodown, setEntryGodown] = useState<string>('FUELLING (Gida Office)')
    const [entryBatch, setEntryBatch] = useState<string>('Primary Batch')
    const [creditEntryTo, setCreditEntryTo] = useState('ITPL Bio-Diesel Filling')
    const [status, setStatus] = useState<{ status: string, companyName?: string }>();
    const [record, setRecord] = useState<WholeTripSheet>();
    const [postProgress, setPostProgress] = useState<{ current: number, total: number } | null>(null);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${BASE_URL}/tripSheet/${params.id}`);
            setRecord(response.data);

            if (response.data.bowser.driver[0]?.name !== "Gida Office") {
                setEntryBatch(response.data.tripSheetId)
            } else {
                setEntryBatch('Primary Batch')
            }

        } catch (error) {
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const checkTallyStatus = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('http://localhost:4000');
            setStatus(data);

            if (data.companyName) {
                await fetchRecords();
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkTallyStatus();
    }, [params.id]);

    const post = async (recordId: string) => {
        setLoading(true);
        const postRecord = record?.dispenses.find(dispense => (dispense._id === recordId))

        const storedUserJson = localStorage.getItem("adminUser");
        let userDetails = { id: "", name: "", phoneNumber: "" };
        if (storedUserJson) {
            const storedUser = JSON.parse(storedUserJson);
            userDetails = {
                id: storedUser.userId || "",
                name: storedUser.name || "",
                phoneNumber: storedUser.phoneNumber || "",
            };
        }

        let variables = {
            entryVoucher,
            entryStock,
            entryGodown,
            entryBatch,
            creditEntryTo,
            HSDRate: record?.hsdRate,
        }

        const xml = await createTallyPostableXML(postRecord!, variables)

        try {
            const response = await fetch('http://localhost:4000/tally', {
                method: 'POST',
                headers: { 'Content-Type': 'application/xml' },
                body: xml,
            });

            const result = await response.json();

            console.log('Tally Sync Response:', result);

            if (result.success && result.data?.vchNumber) {
                // ✅ Update the record in DB
                let postResponse = await fetch(`${BASE_URL}/listDispenses/post/${recordId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ by: { id: userDetails?.id, name: userDetails?.name } })
                });

                console.log(postResponse)

                let postResponseData = await postResponse.json()
                console.log(postResponseData)

                console.log(postResponseData)


                setRecord(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        dispenses: prev.dispenses.map(d =>
                            d._id === recordId ? { ...d, posted: { status: true, by: { id: userDetails.id, name: userDetails.name } } } : d
                        )
                    };
                });

            }
            else {
                if (result.error) {
                    alert(result.message)
                }
            }
            return result
        } catch (error) {
            console.error('Error occurred while posting to Tally:', error);
        }
        finally {
            setLoading(false)
        }

    }

    const postAll = async () => {
        const nonPostedRecords = record?.dispenses.filter(
            (dispense) => dispense.posted?.status === false || dispense.posted == undefined
        );

        if (!nonPostedRecords || nonPostedRecords.length === 0) {
            alert("🎉 All records are already posted!");
            return;
        }

        let successList: string[] = [];
        let failureList: { id: string; reason: string }[] = [];

        setPostProgress({ current: 0, total: nonPostedRecords.length });

        for (let i = 0; i < nonPostedRecords.length; i++) {
            const current = nonPostedRecords[i];
            setPostProgress({ current: i + 1, total: nonPostedRecords.length });

            console.log(`📤 Posting ${i + 1} of ${nonPostedRecords.length}: ${current._id}`);

            try {
                const result = await post(current._id);

                if (result?.success) {
                    successList.push(current._id);
                } else {
                    failureList.push({
                        id: current._id,
                        reason: result?.message || "Unknown server response",
                    });
                }
            } catch (error: any) {
                console.error(`❌ Failed to post record ${current._id}`, error);
                failureList.push({
                    id: current._id,
                    reason: error.message || "Network error",
                });
            }
        }

        setPostProgress(null);

        const alertMessage = `
✅ Posting Completed\n\n
🟢 Success (${successList.length}): ${successList.join('\n') || 'None'}\n
🔴 Failed (${failureList.length}): ${failureList.map(f => `${f.id}: ${f.reason}`).join('\n') || 'None'}
`;
        alert(alertMessage);
    };



    if (error) return <div className="text-red-500 text-center">{error === "Network Error" && "Please Open the Tally Bridge Application and refresh this page"}</div>
    if (status && !status.companyName) return (
        <div className="text-center w-full m-4 items-center">
            {status.status === "Tally is not opened" ? <p className='text-red-500'>{status.status}</p> : status.status === "No company is opened" ? <p className='text-red-500'>{status.status + " Please Open an appropriate Company"}</p> : <p className='text-green-500'>{status.status}</p>}
        </div>
    )

    return (
        <div>
            {loading && <Loading />}
            {postProgress !== null &&
                <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-25">
                    < Progress value={Math.min(100, Math.floor((postProgress.current / postProgress.total) * 100))} />
                </div>
            }
            <div className="mx-auto py-4">
                <Card className='mb-4'>
                    <CardHeader>
                        <CardTitle>Opened company is: {status?.companyName}</CardTitle>
                        <CardDescription></CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Label htmlFor='voucher'>Voucher</Label>
                        <Input id='voucher' type='string' placeholder='Voucher Type Name' value={entryVoucher} onChange={(e) => setEntryVoucher(e.target.value)} />

                        <Label htmlFor='stock'>Stock Item</Label>
                        <Input id='stock' type='string' placeholder='Stock Item Name' value={entryStock} onChange={(e) => setEntryStock(e.target.value)} />

                        <Label htmlFor='credit'>Credit Entry To</Label>
                        <Input id='credit' type='string' placeholder='Enter Credit entry to' value={creditEntryTo} onChange={(e) => setCreditEntryTo(e.target.value)} />

                        <Label htmlFor='godown'>Godown</Label>
                        <Input id='godown' type='string' placeholder='Entry Godown' value={entryGodown} onChange={(e) => setEntryGodown(e.target.value)} />

                        <Label htmlFor='batch'>Entry Batch</Label>
                        <Input id='batch' type='string' placeholder='Entry Batch' value={entryBatch} onChange={(e) => setEntryBatch(e.target.value)} />
                    </CardContent>
                </Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sr No.</TableHead>
                            <TableHead>Voucher Type Name</TableHead>
                            <TableHead>Voucher Number</TableHead>
                            <TableHead>Vehicle Number</TableHead>
                            <TableHead>Driver Name</TableHead>
                            <TableHead>Odometer</TableHead>
                            <TableHead>Fuel Station</TableHead>
                            <TableHead>Load Type</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Debit by</TableHead>
                            <TableHead>Credit to</TableHead>
                            <TableHead>Stock Item Name</TableHead>
                            <TableHead>Godown</TableHead>
                            <TableHead>Batche</TableHead>
                            <TableHead className='text-center'>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {record?.dispenses.map((dispense, index) => (
                            <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{entryVoucher}</TableCell>
                                <TableCell>{dispense._id}</TableCell>
                                <TableCell>{dispense.vehicleNumber}</TableCell>
                                <TableCell>{dispense.driverId && dispense.driverId !== 'NA' ? `${dispense.driverName}-${dispense.driverId}` : dispense.driverName}</TableCell>
                                <TableCell>{dispense.odometer}</TableCell>
                                <TableCell>{dispense.location}</TableCell>
                                <TableCell>{dispense.quantityType}</TableCell>
                                <TableCell>{dispense.fuelQuantity}</TableCell>
                                <TableCell>{record.hsdRate}</TableCell>
                                <TableCell>{dispense.cost}</TableCell>
                                <TableCell>{dispense.category === "Own" ? "Blended Bio-Diesel Consume" : dispense.party}</TableCell>
                                <TableCell>{creditEntryTo}</TableCell>
                                <TableCell>{entryStock}</TableCell>
                                <TableCell>{dispense.bowser.driver.name === "Gida Office" ? entryGodown : `${dispense.bowser.regNo} (Bowser)`}</TableCell>
                                <TableCell>{dispense.bowser.driver.name === "Gida Office" ? entryBatch : record.tripSheetId}</TableCell>
                                <TableCell>{<Button onClick={() => post(dispense._id)} disabled={dispense.posted?.status} variant="default">{dispense.posted?.status ? "Posted" : "Post"}</Button>}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableCaption>
                        <Button variant="default" onClick={() => postAll()}>Post All records</Button>
                    </TableCaption>
                </Table>
            </div>
        </div>
    )
}

export default page
