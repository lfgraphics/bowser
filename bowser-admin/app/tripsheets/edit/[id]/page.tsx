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

export const page = ({ params }: { params: { id: string } }) => {
    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);

    const [record, setRecord] = useState<TripSheet | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [bowserDriver, setBowserDriver] = useState<TripSheet['bowserDriver']>([]);
    const [showSuccessAlert, setShowSuccessAlert] = useState<boolean>(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [editing, setEditing] = useState<boolean>(false);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`https://bowser-backend-2cdr.onrender.com/tripsheet/find-by-id/${params.id}`);
                const sheetData = response.data.sheet;
                // Update the state with the correct structure
                setRecord({
                    _id: sheetData._id,
                    tripSheetId: sheetData.tripSheetId || '',
                    tripSheetGenerationDateTime: sheetData.tripSheetGenerationDateTime || '',
                    bowser: {
                        regNo: sheetData.bowser?.regNo || '',
                    },
                    bowserDriver: sheetData.bowserDriver || [],
                    chamberWiseDipList: sheetData.chamberWiseDipList || [],
                    chamberWiseSealList: sheetData.chamberWiseSealList || [],
                    proposedDepartureDateTime: sheetData.proposedDepartureDateTime || '',
                    settelment: sheetData.settelment || { settled: false },
                    bowserOdometerStartReading: sheetData.bowserOdometerStartReading || 0,
                    fuelingAreaDestination: sheetData.fuelingAreaDestination || '',
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
            const updatedTripSheet = { ...record, bowserDriver };
            await axios.patch(`https://bowser-backend-2cdr.onrender.com/tripSheet/update/${params.id}`, updatedTripSheet); //https://bowser-backend-2cdr.onrender.com http://localhost:5000
            setShowSuccessAlert(true);
            setEditing(false)
        } catch (error) {
            console.error('Error updating Trip Sheet:', error);
            alert(`Error updating Trip Sheet: ${error}`);
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`https://bowser-backend-2cdr.onrender.com/tripSheet/delete/${params.id}`);
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
        setBowserDriver([...bowserDriver, { handOverDate: '', name: '', id: '', phoneNo: '' }]);
    };

    if (loading) return <Loading />;

    return (
        <div className='flex flex-col gap-3'>
            <div className='flex gap-3 items-center'>
                <h1>Trip Sheet: {record?.tripSheetId}</h1>
                <Button variant="ghost" onClick={() => setEditing(!editing)}>
                    {editing ? 'Cancel' : 'Edit'}
                </Button>
            </div>
            <h3>Generation Time: {record?.tripSheetGenerationDateTime}</h3>
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
                        <Label>Driver Id: {!editing && driver.id}</Label>
                        {editing && <Input
                            value={driver.id}
                            onChange={(e) => {
                                const updatedDrivers = [...bowserDriver];
                                updatedDrivers[index].id = e.target.value;
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
                        <Label>Handover Date, Time: {!editing && driver.handOverDate}</Label>
                        {editing && <Input
                            type="datetime-local"
                            value={driver.handOverDate}
                            onChange={(e) => {
                                const updatedDrivers = [...bowserDriver];
                                updatedDrivers[index].handOverDate = e.target.value;
                                setBowserDriver(updatedDrivers);
                            }}
                        />}
                    </div>
                ))}
                {editing && <Button onClick={addBowserDriver}>Add Another Driver</Button>}
            </div>

            {/* Additional Fields for TripSheet */}
            <Label>Bowser Odometer Start Reading: {!editing && record?.bowserOdometerStartReading}</Label>
            {
                editing &&
                <Input
                    type="number"
                    value={record?.bowserOdometerStartReading}
                    onChange={(e) => setRecord({ ...record, bowserOdometerStartReading: Number(e.target.value) })}
                />
            }

            <Label>Fueling Area Destination: {!editing && record?.fuelingAreaDestination}</Label>
            {editing &&
                <Input
                    value={record?.fuelingAreaDestination}
                    onChange={(e) => setRecord({ ...record, fuelingAreaDestination: e.target.value })}
                />
            }

            <Label>Bowser Pump End Reading: {!editing && record?.bowserPumpEndReading}</Label>
            {editing &&
                <Input
                    value={record?.bowserPumpEndReading}
                    onChange={(e) => setRecord({ ...record, bowserPumpEndReading: e.target.value })}
                />
            }

            <Label>Proposed Departure Date Time: {!editing && record?.proposedDepartureDateTime}</Label>
            {editing &&
                <Input
                    type="datetime-local"
                    value={record?.proposedDepartureDateTime}
                    onChange={(e) => setRecord({ ...record, proposedDepartureDateTime: e.target.value })}
                />
            }

            <p className='mt-4 font-bold'>Settelment:</p>
            <div className='flex gap-3'>
                <Label>Settled: </Label>
                <Checkbox
                    checked={record?.settelment?.settled}
                    onCheckedChange={(checked) => setRecord({ ...record, settelment: { ...record?.settelment, settled: checked } })}
                    disabled={!editing}
                />
            </div>
            {record?.settelment?.settled &&
                <>
                    <Label>Settlement Date Time: {!editing && record?.settelment?.dateTime}</Label>
                    {editing && <Input
                        type="datetime-local"
                        value={record?.settelment?.dateTime}
                        onChange={(e) => setRecord({ ...record, settelment: { ...record?.settelment, dateTime: e.target.value } })}
                    />}

                    <Label>Odometer Closing: {!editing && record?.settelment?.odometerClosing?.[0]}</Label>
                    {editing && <Input
                        type="number"
                        value={record?.settelment?.odometerClosing?.[0] || ''}
                        onChange={(e) => setRecord({ ...record, settelment: { ...record?.settelment, odometerClosing: { 0: Number(e.target.value) } } })}
                    />}

                    <Label>Bowser New End Reading: {!editing && record?.settelment?.bowserNewEndReading?.[0]}</Label>
                    {editing && <Input
                        type="number"
                        value={record?.settelment?.bowserNewEndReading?.[0] || ''}
                        onChange={(e) => setRecord({ ...record, settelment: { ...record?.settelment, bowserNewEndReading: { 0: Number(e.target.value) } } })}
                    />}
                </>
            }

            <div className="felx flex-row gap-3">
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