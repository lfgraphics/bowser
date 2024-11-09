"use client"
import React, { useEffect, useState } from 'react';
import { Label } from "@/components/ui/label"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TripSheet } from '@/types';
import Loading from '@/app/loading';
import { isAuthenticated } from '@/lib/auth';

const TripSheetCreationPage: React.FC = () => {
    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);
    const [tripSheetId, setTripSheetId] = useState<string>('');
    const [tripSheetGenerationDateTime, setTripSheetGenerationDateTime] = useState<string>(
        new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    );
    const [bowserDriver, setBowserDriver] = useState<{ handOverDate: string; name: string; id: string; phoneNo: string }[]>([
        { handOverDate: '', name: '', id: '', phoneNo: '' },
    ]);
    const [bowserRegNo, setBowserRegNo] = useState<string>('');
    const [bowserOdometerStartReading, setBowserOdometerStartReading] = useState<number | undefined>(undefined);
    const [fuelingAreaDestination, setFuelingAreaDestination] = useState<string | undefined>(undefined);
    const [proposedDepartureDateTime, setProposedDepartureDateTime] = useState<string | undefined>(undefined);
    const [referenceToBowserLoadingSheetID, setReferenceToBowserLoadingSheetID] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(false);
    const [alertDialogOpen, setAlertDialogOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");

    const resetForm = () => {
        setTripSheetId('');
        setTripSheetGenerationDateTime(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        setBowserDriver([{ handOverDate: '', name: '', id: '', phoneNo: '' }]);
        setBowserRegNo('');
        setBowserOdometerStartReading(undefined);
        setFuelingAreaDestination(undefined);
        setProposedDepartureDateTime(undefined);
        setReferenceToBowserLoadingSheetID(undefined);
        setAlertDialogOpen(false);
        setAlertMessage("");
    }

    const createTripSheet = async (tripSheet: TripSheet) => {
        try {
            const response = await fetch('https://bowser-backend-2cdr.onrender.com/tripSheet/create', { //https://bowser-backend-2cdr.onrender.com http://localhost:5000
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tripSheet),
            });

            if (!response.ok) {
                throw new Error('Failed to create Trip Sheet\n' + response.text);
            }

            const result = await response.json();
            setAlertMessage(result.message);
            setAlertDialogOpen(true);
        } catch (error) {
            setAlertMessage('Error creating TripSheet: ' + error);
            setAlertDialogOpen(true);
        }
    };

    // Handler to submit the form
    const handleSubmit = async () => {
        setLoading(true)
        try {
            const newTripSheet: TripSheet = {
                tripSheetId,
                tripSheetGenerationDateTime,
                bowserDriver,
                bowser: { regNo: bowserRegNo },
                bowserOdometerStartReading,
                fuelingAreaDestination,
                proposedDepartureDateTime,
                referenceToBowserLoadingSheetID,
                settelment: {
                    dateTime: undefined,
                    odometerClosing: {},
                    bowserNewEndReading: {},
                    settled: false,
                },
            };
            await createTripSheet(newTripSheet);
        } catch (error) {
            setAlertMessage('Error creating TripSheet: ' + error);
            setAlertDialogOpen(true);
        } finally {
            setLoading(false)
        }
    };

    return (
        <div className="p-6 bg-background text-foreground rounded-md shadow-md">
            {loading && <Loading />}
            <h1 className="text-xl font-bold mb-4">Create New TripSheet</h1>

            <div className="mb-4">
                <Label>Trip Sheet ID</Label>
                <Input
                    value={tripSheetId}
                    onChange={(e) => setTripSheetId(e.target.value)}
                    placeholder="Enter TripSheet ID"
                />
            </div>

            <div className="mb-4">
                <Label>Bowser Registration No</Label>
                <Input
                    value={bowserRegNo}
                    onChange={(e) => {
                        setBowserRegNo(e.target.value)
                    }
                    }
                    placeholder="Enter Bowser Registration No"
                />
            </div>

            <div className="mb-4">
                <Label>Odometer Start Reading</Label>
                <Input
                    type="number"
                    value={bowserOdometerStartReading || ''}
                    onChange={(e) => setBowserOdometerStartReading(Number(e.target.value))}
                    placeholder="Enter Odometer Start Reading"
                />
            </div>

            <div className="mb-4">
                <Label>Fueling Area Destination</Label>
                <Input
                    value={fuelingAreaDestination || ''}
                    onChange={(e) => setFuelingAreaDestination(e.target.value)}
                    placeholder="Enter Fueling Area Destination"
                />
            </div>

            <div className="mb-4">
                <Label>Proposed Departure Date & Time</Label>
                <Input
                    type="datetime-local"
                    value={proposedDepartureDateTime || ''}
                    onChange={(e) => setProposedDepartureDateTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                />
            </div>

            <div className="mb-4">
                <Label>Reference to Bowser Loading Sheet ID</Label>
                <Input
                    value={referenceToBowserLoadingSheetID || ''}
                    onChange={(e) => setReferenceToBowserLoadingSheetID(e.target.value)}
                    placeholder="Enter Reference ID"
                />
            </div>

            {/* <div className="mb-4">
                <Label>Is Settled?</Label>
                <Select
                value={settled.toString()}
                onValueChange={(value) => setSettled(value === 'true')}
                >
                <SelectTrigger className="w-full">
                        <SelectValue placeholder="Is Settled?" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                        </Select>
                        </div> */}

            {bowserDriver.map((driver, index) => (
                <div key={index} className="mb-4 border-t pt-4">
                    <Label>{`Driver ID`}</Label>
                    {/* //${index + 1} */}
                    <Input
                        value={driver.id}
                        onChange={(e) =>
                            setBowserDriver(bowserDriver.map((d, i) => (i === index ? { ...d, id: e.target.value } : d)))
                        }
                        placeholder="Enter Driver ID"
                    />
                    <Label>{`Driver Name`}</Label>
                    {/* //${index + 1} */}
                    <Input
                        value={driver.name}
                        onChange={(e) =>
                            setBowserDriver(
                                bowserDriver.map((d, i) => (i === index ? { ...d, name: e.target.value } : d))
                            )
                        }
                        placeholder="Enter Driver Name"
                    />
                    <Label>{`Driver Phone No`}</Label>
                    {/* //${index + 1} */}
                    <Input
                        value={driver.phoneNo}
                        onChange={(e) =>
                            setBowserDriver(
                                bowserDriver.map((d, i) => (i === index ? { ...d, phoneNo: e.target.value } : d))
                            )
                        }
                        placeholder="Enter Phone No"
                    />
                    {/* <Label>{`Driver HandOver Date`}</Label>
                    <Input
                        type="datetime-local"
                        value={driver.handOverDate}
                        min={new Date().toISOString().slice(0, 16)} // Set the minimum value to the current date and time
                        onChange={(e) =>
                            setBowserDriver(
                                bowserDriver.map((d, i) => (i === index ? { ...d, handOverDate: e.target.value } : d))
                            )
                        }

                    /> */}
                </div>
            ))}

            {/* <Button onClick={addBowserDriver} className="mb-4">
                <Plus className="mr-2" /> Add Bowser Driver
                </Button> */}


            <Button onClick={handleSubmit} className="mt-4" variant="default" disabled={loading}>
                Create TripSheet
            </Button>

            <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Fueling Allocation Result</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertMessage}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => {
                            setAlertDialogOpen(false);
                            resetForm();
                        }}>
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default TripSheetCreationPage;