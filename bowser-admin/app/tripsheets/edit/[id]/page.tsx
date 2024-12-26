"use client"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { TripSheet } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import Loading from '@/app/loading';
import { Checkbox } from '@/components/ui/checkbox';
import { isAuthenticated } from '@/lib/auth';
import { BASE_URL } from '@/lib/api';
import Link from 'next/link';

const page = ({ params }: { params: { id: string } }) => {
    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);

    const [record, setRecord] = useState<TripSheet | undefined>();
    const [loading, setLoading] = useState<boolean>(true);
    const [bowserDriver, setBowserDriver] = useState<TripSheet['bowser']['driver']>([]);
    const [showSuccessAlert, setShowSuccessAlert] = useState<boolean>(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [editing, setEditing] = useState<boolean>(false);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${BASE_URL}/tripsheet/find-by-id/${params.id}`);
                const sheetData = response.data;
                // Update the state with the correct structure
                setRecord({
                    _id: sheetData._id,
                    tripSheetId: sheetData.tripSheetId || 0,
                    tripSheetGenerationDateTime: sheetData.tripSheetGenerationDateTime || undefined,
                    bowser: {
                        regNo: sheetData.bowser?.regNo || '',
                        odometerStartReading: sheetData.bowser?.odometerStartReading || 0,
                        driver: sheetData.bowserDriver || [],
                        pumpEndReading: sheetData.bowserPumpEndReading || 0,
                    },
                    fuelingAreaDestination: sheetData.fuelingAreaDestination || '',
                    proposedDepartureTime: sheetData.proposedDepartureDateTime || '',
                    settelment: sheetData.settelment || { settled: false, dateTime: new Date(), details: { pumpReading: '', chamberwiseDipList: [], totalQty: 0 } },
                    bowserOdometerStartReading: sheetData.bowserOdometerStartReading || 0,
                    bowserPumpEndReading: sheetData.bowserPumpEndReading || '',
                });
                setBowserDriver(sheetData.bowserDriver || []);
            } catch (error) {
                console.error('Error fetching records:', error);
                alert(`Error fetching records: ${error}`);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [params.id]);

    const handleUpdate = async () => {
        if (!record) return;
        try {
            const updatedTripSheet: TripSheet = {
                ...record,
                bowser: {
                    ...record.bowser,
                    driver: bowserDriver,
                },
            };
            await axios.patch(`${BASE_URL}/tripSheet/update/${params.id}`, updatedTripSheet);
            setShowSuccessAlert(true);
            setEditing(false)
        } catch (error) {
            console.error('Error updating Trip Sheet:', error);
            alert(`Error updating Trip Sheet: ${error}`);
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`${BASE_URL}/tripSheet/delete/${params.id}`);
            setShowSuccessAlert(true);
            window.history.back()
        } catch (error) {
            console.error('Error deleting Trip Sheet:', error);
            alert(`Error deleting Trip Sheet: ${error}`);
        } finally {
            setShowDeleteDialog(false);
        }
    };

    const addBowserDriver = () => {
        setBowserDriver([...bowserDriver, { handOverDate: new Date(), name: '', phoneNo: '' }]);
    };

    if (loading) return <Loading />;

    return (
        <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-3'>
                <h1>Trip Sheet: {record?.tripSheetId}</h1>
                <Button variant="ghost" onClick={() => setEditing(!editing)}>
                    {editing ? 'Cancel' : 'Edit'}
                </Button>
            </div>
            <h3>Generation Time: {record?.tripSheetGenerationDateTime?.toString().slice(0, 16)}</h3>
            <Label>Bowser: {!editing && record?.bowser.regNo}</Label>
            {editing && <Input
                value={record?.bowser.regNo}
                onChange={(e) => setRecord({ ...record, bowser: { ...record?.bowser, regNo: e.target.value } })}
            />}
            <div className='flex flex-col gap-3 my-4'>
                {bowserDriver.map((driver, index) => (
                    <div key={index} className='flex flex-col gap-3'>
                        <Label>Driver Name: {!editing && driver.name}</Label>
                        {editing && <Input
                            value={driver.name}
                            onChange={(e) => {
                                const updatedDrivers = [...bowserDriver];
                                updatedDrivers[index].name = e.target.value;
                                setBowserDriver(updatedDrivers);
                            }}
                        />}
                        <Label>Driver Phone No.: {!editing && driver.phoneNo}</Label>
                        {editing && <Input
                            value={driver.phoneNo}
                            onChange={(e) => {
                                const updatedDrivers = [...bowserDriver];
                                updatedDrivers[index].phoneNo = e.target.value;
                                setBowserDriver(updatedDrivers);
                            }}
                        />}
                        <Label>Handover Date, Time: {(editing == false && `${driver.handOverDate}`)}</Label>
                    </div>
                ))}
                {editing && <Button onClick={addBowserDriver}>Add Another Driver</Button>}
            </div>

            {/* Additional Fields for TripSheet */}
            <Label>Bowser Odometer Start Reading: {!editing && record?.bowser.odometerStartReading}</Label>
            {
                editing &&
                <Input
                    type="number"
                    value={record?.bowser.odometerStartReading}
                    onChange={(e) => setRecord({ ...record, bowser: { ...record?.bowser, odometerStartReading: Number(e.target.value) } })}
                />
            }

            <Label>Fueling Area Destination: {!editing && record?.fuelingAreaDestination}</Label>
            {editing &&
                <Input
                    value={record?.fuelingAreaDestination}
                    onChange={(e) => setRecord({ ...record, fuelingAreaDestination: e.target.value })}
                />
            }

            <Label>Bowser Pump End Reading: {!editing && record?.bowser.pumpEndReading}</Label>
            {editing &&
                <Input
                    value={record?.bowser.pumpEndReading}
                    onChange={(e) => setRecord({ ...record, bowserPumpEndReading: e.target.value })}
                />
            }

            <Label>Proposed Departure Date Time: {!editing && record?.proposedDepartureTime}</Label>
            {editing &&
                <Input
                    type="datetime-local"
                    value={record?.proposedDepartureTime}
                    onChange={(e) => setRecord({ ...record, proposedDepartureTime: e.target.value })}
                />
            }

            <p className='mt-4 font-bold'>Settelment:</p> <Link href={`/tripsheets/settle/${params.id}`}><Button variant="link">Settle</Button></Link>
            {/* <div className='flex gap-3'>
                <Label>Settled: </Label>
                <Checkbox
                    checked={record?.settelment?.settled}
                    onCheckedChange={(checked) => setRecord({ ...record, settelment: { ...record?.settelment, settled: checked } })}
                    disabled={!editing}
                />
            </div>
            {record?.settelment?.settled &&
                <>
                    <Label>Settlement Date Time: {!editing && record?.settelment?.dateTime.toString()}</Label>
                    {editing && <Input
                        type="datetime-local"
                        value={record?.settelment?.dateTime?.toLocaleDateString()}
                        onChange={(e) => setRecord({ ...record, settelment: { ...record?.settelment, dateTime: new Date(e.target.value) } })}
                        disabled={!editing}
                    />}

                    <Label>Odometer Closing: {!editing && record?.settelment?.details?.pumpReading}</Label>
                    {editing && <Input
                        type="number"
                        value={record?.settelment?.details?.pumpReading || ''}
                        onChange={(e) => setRecord({ ...record, settelment: { ...record?.settelment, details: { ...record?.settelment?.details, pumpReading: e.target.value } } })}
                        disabled={!editing}
                    />}

                    <Label>Bowser pump end reading: {!editing && record?.settelment?.bowserNewEndReading?.[0]}</Label>
                    {editing && <Input
                        type="number"
                        value={record?.settelment?.bowserNewEndReading?.[0] || ''}
                        onChange={(e) => setRecord({ ...record, settelment: { ...record?.settelment, bowserNewEndReading: { 0: Number(e.target.value) } } })}
                    />}
                </>
            } */}

            <div className="flex-row gap-3 felx">
                <Button className='mr-3' disabled={!editing} onClick={handleUpdate}>Update Trip Sheet</Button>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>Delete Trip Sheet</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this trip sheet? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            {showSuccessAlert && (
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
            )}
        </div>
    );
};

export default page;