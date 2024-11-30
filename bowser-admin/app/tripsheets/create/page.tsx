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
import { ResponseBowser, TripSheet, User } from '@/types';
import Loading from '@/app/loading';
import { isAuthenticated } from '@/lib/auth';
import { SearchModal } from '@/components/SearchModal';
import { searchItems } from '@/utils/searchUtils';
import { BASE_URL } from '@/lib/api';

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
    const [tripSheetId, setTripSheetId] = useState<number>(0);
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
    const [searchModalConfig, setSearchModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        items: any[];
        onSelect: (item: any) => void;
        renderItem: (item: any) => React.ReactNode;
        keyExtractor: (item: any) => string;
    }>({
        isOpen: false,
        title: "",
        items: [],
        onSelect: () => { },
        renderItem: () => null,
        keyExtractor: () => "",
    });

    const resetForm = () => {
        setTripSheetId(0);
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
            const response = await fetch(`${BASE_URL}/tripSheet/create`, { //https://bowser-backend-2cdr.onrender.com http://localhost:5000
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tripSheet),
            });

            const result = await response.json();
            setAlertMessage(result.message);
            setAlertDialogOpen(true);
        } catch (error) {
            setAlertMessage('Error creating TripSheet: ' + error);
            setAlertDialogOpen(true);
        }
    };

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const newTripSheet: TripSheet = {
                tripSheetId,
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

    const searchBowser = async (regNo: string) => {
        setLoading(true);
        try {
            const response: ResponseBowser[] = await searchItems<ResponseBowser>(
                `${BASE_URL}/searchBowserDetails`, //https://bowser-backend-2cdr.onrender.com
                regNo,
                `No proper details found with the given regNo ${regNo}`
            );
            if (response.bowserDetails.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Bowser",
                    items: response.bowserDetails,
                    onSelect: handleBowserSelection,
                    renderItem: (bowser) => `Bowser: ${bowser.regNo}`,
                    keyExtractor: (bowser) => bowser.regNo,
                });
            }
        } catch (error) {
            console.error('Error searching for driver:', error);
        } finally {
            setLoading(false);
        }
    }
    const handleBowserSelection = (bowser: ResponseBowser) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (bowser) {
            setBowserRegNo(bowser.regNo);
        }
    }

    const searchDriver = async (userId: string) => {
        setLoading(true);
        try {
            const drivers = await searchItems<User>(
                `${BASE_URL}/searchDriver/bowser-drivers`, //https://bowser-backend-2cdr.onrender.com
                userId,
                'No driver found with the given ID'
            );
            if (drivers.length > 0) {
                console.log(drivers)
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Driver",
                    items: drivers,
                    onSelect: handleDriverSelection,
                    renderItem: (driver) => `${driver.name} (${driver.id})`,
                    keyExtractor: (driver) => driver.id,
                });
            }
        } catch (error) {
            console.error('Error searching for driver:', error);
        } finally {
            setLoading(false);
        }
    }
    const handleDriverSelection = (driver: User) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (driver) {
            setBowserDriver([{ ...driver, id: driver.id, name: driver.name, phoneNo: driver.phoneNo }]);
        }
    }


    return (
        <div className="p-6 bg-background text-foreground rounded-md shadow-md">
            {loading && <Loading />}
            <h1 className="text-xl font-bold mb-4">Create New TripSheet</h1>

            <div className="mb-4">
                <Label>Trip Sheet ID</Label>
                <Input
                    type='number'
                    value={tripSheetId}
                    onChange={(e) => setTripSheetId(Number(e.target.value))}
                    placeholder="Enter TripSheet ID"
                />
            </div>

            <div className="mb-4">
                <Label>Bowser Registration No</Label>
                <Input
                    value={bowserRegNo}
                    onChange={(e) => {
                        const value = e.target.value;
                        setBowserRegNo(value);
                        if (value.length > 3) {
                            searchBowser(value);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            searchBowser(bowserRegNo);
                        }
                    }}
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
                {/* this might be generated programmatically in future */}
                <Input
                    value={referenceToBowserLoadingSheetID || ''}
                    onChange={(e) => setReferenceToBowserLoadingSheetID(e.target.value)}
                    placeholder="Enter Reference ID"
                />
            </div>

            {bowserDriver.map((driver, index) => (
                <div key={index} className="mb-4 border-t pt-4">
                    <Label>{`Driver ID`}</Label>
                    <Input
                        value={driver.id}
                        onChange={(e) => {
                            const value = e.target.value;
                            setBowserDriver(bowserDriver.map((d, i) => (i === index ? { ...d, id: e.target.value } : d)))
                            if (value.length > 3) {
                                searchDriver(value);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && driver.id.length > 3) {
                                e.preventDefault();
                                searchDriver(driver.id);
                            }
                        }}
                        placeholder="Enter Driver ID"
                    />
                    <Label>{`Driver Name`}</Label>
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
                    <Input
                        value={driver.phoneNo}
                        onChange={(e) =>
                            setBowserDriver(
                                bowserDriver.map((d, i) => (i === index ? { ...d, phoneNo: e.target.value } : d))
                            )
                        }
                        placeholder="Enter Phone No"
                    />
                </div>
            ))}

            <Button onClick={handleSubmit} className="mt-4" variant="default" disabled={loading}>
                Create TripSheet
            </Button>

            <SearchModal
                isOpen={searchModalConfig.isOpen}
                onClose={() => setSearchModalConfig((prev) => ({ ...prev, isOpen: false }))}
                title={searchModalConfig.title}
                items={searchModalConfig.items}
                onSelect={searchModalConfig.onSelect}
                renderItem={searchModalConfig.renderItem}
                keyExtractor={searchModalConfig.keyExtractor}
            />

            <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Response Result</AlertDialogTitle>
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