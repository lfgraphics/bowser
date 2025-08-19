"use client"
import { useEffect, useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { BASE_URL } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types/auth';
import Loading from '@/app/loading';
import { getLocation } from '@/utils';
import { getLocation } from '@/utils';

const AddRecordPage = ({ searchParams }: { searchParams: { tripSheetId?: number, bowser: string } }) => {
    const [loading, setLoading] = useState<boolean>()
    const [currentUser, setCurrentUser] = useState<User | null>()
    useEffect(() => {
        let user = getCurrentUser()
        console.log(user)
        setCurrentUser(user)
    }, [searchParams])
    const [records, setRecords] = useState([{
        id: Date.now(),
        category: 'Own',
        party: 'Own',
        odometer: 0,
        tripSheetId: searchParams.tripSheetId || '',
        vehicleNumber: '',
        driverId: '',
        driverName: '',
        driverMobile: '',
        quantityType: 'Full',
        fuelQuantity: 0,
        gpsLocation: '',
        fuelingLocation: '',
        fuelingDateTime: new Date().toISOString().split('T')[0],
        bowser: {
            regNo: searchParams.bowser,
            driver: {
                name: currentUser?.name,
                phoneNo: currentUser?.phoneNumber
            }
        },
        allocationAdmin: {
            id: ''
        }
    }]);
    const { toast } = useToast();

    const addRecord = () => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            setRecords([...records, {
                id: Date.now(),
                category: 'Own',
                party: 'Own',
                odometer: 0,
                tripSheetId: searchParams.tripSheetId || '',
                vehicleNumber: '',
                driverId: '',
                driverName: '',
                driverMobile: '',
                fuelQuantity: 0,
                gpsLocation: '',
                fuelingLocation: '',
                quantityType: "Full",
                fuelingDateTime: new Date().toISOString().split('T')[0],
                bowser: {
                    regNo: searchParams.bowser,
                    driver: {
                        name: currentUser.name,
                        phoneNo: currentUser.phoneNumber
                    }
                },
                allocationAdmin: {
                    id: ''
                }
            }])
        };
    };

    const removeRecord = (id: number) => {
        setRecords(records.filter(record => record.id !== id));
    };

    const handleSubmit = async () => {
        setLoading(true)
        const locationResult = await getLocation();
        const gpsLocation = typeof locationResult === "string" ? locationResult : "";

        const locationResult = await getLocation();
        const gpsLocation = typeof locationResult === "string" ? locationResult : "";

        const preparedRecords = records.map(record => ({
            ...record,
            vehicleNumberPlateImage: "",
            gpsLocation,
            location: `ITPL Bio-Diesel Pump-${String(record.fuelingLocation).toUpperCase()}`,
            fuelMeterImage: "",
            bowser: {
                regNo: searchParams.bowser,
                driver: {
                    name: currentUser?.name,
                    phoneNo: currentUser?.phoneNumber
                }
            }
        }));

        try {
            const response = await axios.post(`${BASE_URL}/addFuelingTransaction/bulk`, preparedRecords);
            toast({ title: 'Success', description: response.data.message, variant: "success" });
            toast({ title: 'Success', description: response.data.message, variant: "success" });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to submit records', variant: "destructive" });
        } finally {
            setLoading(false)
        }
    };

    return (
        <div className="flex justify-center items-center bg-background mt-6 py-4 min-h-full">
            {loading && <Loading />}
            <div className="w-full">
                <h1 className="font-bold text-xl">Bulk Fueling Entry in Trip: {searchParams.tripSheetId}</h1>
                <Toaster />
                <Table className="w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead>SN.</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Party</TableHead>
                            <TableHead>Odometer</TableHead>
                            <TableHead>Vehicle Number</TableHead>
                            <TableHead>Driver ID</TableHead>
                            <TableHead>Driver Name</TableHead>
                            <TableHead>Driver Mobile</TableHead>
                            <TableHead>Quantity type</TableHead>
                            <TableHead>Fuel Quantity</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Order By</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.map((record, index) => (
                            <TableRow key={record.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                    <Input
                                        type="date"
                                        value={record.fuelingDateTime}
                                        onChange={(e) => {
                                            const newRecords = [...records];
                                            newRecords[index].fuelingDateTime = e.target.value;
                                            setRecords(newRecords);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Select value={record.category} onValueChange={(value) => {
                                        const newRecords = [...records];
                                        newRecords[index].category = value;
                                        setRecords(newRecords);
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="Own">Own</SelectItem>
                                                <SelectItem value="Attach">Attach</SelectItem>
                                                <SelectItem value="Bulk Sale">Bulk Sale</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="text"
                                        value={record.party} onChange={(e) => {
                                            const newRecords = [...records];
                                            newRecords[index].party = e.target.value;
                                            setRecords(newRecords);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={record.odometer}
                                        onChange={(e) => {
                                            const newRecords = [...records];
                                            newRecords[index].odometer = Number(e.target.value);
                                            setRecords(newRecords);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="text"
                                        value={record.vehicleNumber}
                                        onChange={(e) => {
                                            const newRecords = [...records];
                                            newRecords[index].vehicleNumber = e.target.value;
                                            setRecords(newRecords);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="text"
                                        value={record.driverId}
                                        onChange={(e) => {
                                            const newRecords = [...records];
                                            newRecords[index].driverId = e.target.value;
                                            setRecords(newRecords);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="text"
                                        value={record.driverName}
                                        onChange={(e) => {
                                            const newRecords = [...records];
                                            newRecords[index].driverName = e.target.value;
                                            setRecords(newRecords);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="text"
                                        value={record.driverMobile}
                                        onChange={(e) => {
                                            const newRecords = [...records];
                                            newRecords[index].driverMobile = e.target.value;
                                            setRecords(newRecords);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Select value={record.quantityType} onValueChange={(value) => {
                                        const newRecords = [...records];
                                        newRecords[index].quantityType = value;
                                        setRecords(newRecords);
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Quantity type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="Full">Full</SelectItem>
                                                <SelectItem value="Part">Part</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={record.fuelQuantity}
                                        onChange={(e) => {
                                            const newRecords = [...records];
                                            newRecords[index].fuelQuantity = Number(e.target.value);
                                            setRecords(newRecords);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="text"
                                        value={record.fuelingLocation}
                                        onChange={(e) => {
                                            const newRecords = [...records];
                                            newRecords[index].fuelingLocation = e.target.value;
                                            setRecords(newRecords);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="text"
                                        value={record.allocationAdmin.id}
                                        onChange={(e) => {
                                            const newRecords = [...records];
                                            newRecords[index].allocationAdmin.id = e.target.value;
                                            setRecords(newRecords);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button type="button" onClick={() => removeRecord(record.id)}>Remove</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className='flex justify-around gap-3 mt-4 w-full'>
                    <Button type="button" onClick={addRecord}>+ Add Row</Button>
                    <Button type="button" onClick={handleSubmit}>Submit Records</Button>
                </div>
            </div>
        </div>
    );
};

export default AddRecordPage;