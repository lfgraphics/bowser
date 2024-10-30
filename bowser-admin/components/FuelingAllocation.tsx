/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, getCurrentUser } from "@/lib/auth"
import { BowserResponse, Driver, ResponseBowser, User } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SearchModal } from "@/components/SearchModal"
import { searchItems } from '@/utils/searchUtils'
import { Vehicle } from "@/types"
import { ObjectId } from "mongoose"

export default function FuelingAllocation() {
    const [isSearching, setIsSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [foundDrivers, setFoundDrivers] = useState<Driver[]>([]);
    const [foundBowsers, setFoundBowsers] = useState<BowserResponse>();
    const [foundVehicles, setFoundVehicles] = useState<Vehicle[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [vehicleNumber, setVehicleNumber] = useState("")
    const [driverId, setDriverId] = useState("")
    const [driverName, setDriverName] = useState("")
    const [driverMobile, setDriverMobile] = useState("")
    const [fuelQuantity, setFuelQuantity] = useState('0')
    const [quantityType, setQuantityType] = useState<'Full' | 'Part'>('Full')
    const [bowserDriverName, setBowserDriverName] = useState("")
    const [bowserDriverId, setBowserDriverId] = useState("")
    const [bowserRegNo, setBowserRegNo] = useState("")
    const [bowserId, setBowserId] = useState("")
    const [bowserDriverMongoId, setBowserDriverMongoId] = useState<ObjectId>()
    const [bowserDrivers, setBowserDrivers] = useState<User[]>([]);
    const [selectedBowserDriver, setSelectedBowserDriver] = useState<User | null>(null);
    const [bowserDriverModalVisible, setBowserDriverModalVisible] = useState(false);
    const router = useRouter()
    const [adminLocation, setAdminLocation] = useState('');
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

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/login')
        }
    }, [router])

    useEffect(() => {
        getAdminLocation();
    }, []);

    const getAdminLocation = async () => {
        if ('geolocation' in navigator) {
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                const { latitude, longitude } = position.coords;
                setAdminLocation(`Latitude ${latitude}, Longitude ${longitude}`);
            } catch (error) {
                console.error('Error getting location:', error);
                setAdminLocation('Location not available');
            }
        } else {
            setAdminLocation('Geolocation not supported');
        }
    };

    const searchDriver = async (idNumber: string) => {
        setIsSearching(true);
        try {
            const drivers = await searchItems<Driver>(
                'https://bowser-backend-2cdr.onrender.com/searchDriver', //https://bowser-backend-2cdr.onrender.com
                idNumber,
                'No driver found with the given ID'
            );
            setFoundDrivers(drivers);

            if (drivers.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Driver",
                    items: drivers,
                    onSelect: handleDriverSelection,
                    renderItem: (driver) => `${driver.Name}`,
                    keyExtractor: (driver) => driver.ITPLId || driver.Name,
                });
            }
        } catch (error) {
            setFoundDrivers([]);
            console.error('Error searching for driver:', error);
        } finally {
            setIsSearching(false);
        }
    }
    const searchBowser = async (regNo: string) => {
        setIsSearching(true);
        try {
            const response: ResponseBowser[] = await searchItems<ResponseBowser>(
                'https://bowser-backend-2cdr.onrender.com/searchBowserDetails', //https://bowser-backend-2cdr.onrender.com
                regNo,
                `No proper details found with the given regNo ${regNo}`
            );
            if (response.bowserDetails.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Bowser",
                    items: response.bowserDetails,
                    onSelect: handleBowserSelection,
                    renderItem: (bowser) => `Bowser: ${bowser.regNo}\nDriver: ${bowser.bowserDriver.name} (${bowser.bowserDriver.userId})`,
                    keyExtractor: (bowser) => bowser.regNo,
                });
            }
        } catch (error) {
            setFoundDrivers([]);
            console.error('Error searching for driver:', error);
        } finally {
            setIsSearching(false);
        }
    }

    const searchVehicle = async (vehicleNumber: string) => {
        setIsSearching(true);
        try {
            const vehicles = await searchItems<Vehicle>(
                'https://bowser-backend-2cdr.onrender.com/searchVehicleNumber', //https://bowser-backend-2cdr.onrender.com
                vehicleNumber,
                'No vehicle found with the given number'
            );
            setFoundVehicles(vehicles);

            if (vehicles.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Vehicle",
                    items: vehicles,
                    onSelect: handleVehicleSelection,
                    renderItem: (vehicle) => vehicle.VehicleNo,
                    keyExtractor: (vehicle) => vehicle.VehicleNo,
                });
            }
        } catch (error) {
            setFoundVehicles([]);
            console.error('Error searching for vehicle:', error);
        } finally {
            setIsSearching(false);
        }
    }

    const handleDriverSelection = (driver: Driver) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (driver) {
            const lastUsedNumber = driver.MobileNo?.find(num => num.LastUsed);
            const defaultNumber = driver.MobileNo?.find(num => num.IsDefaultNumber);
            const firstNumber = driver.MobileNo?.[0];
            const mobileNumber = (lastUsedNumber || defaultNumber || firstNumber)?.MobileNo || '';

            const idMatch = driver.Name.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
            let cleanName = driver.Name.trim();
            let recognizedId = '';

            if (idMatch) {
                recognizedId = idMatch[0].replace(/[()]/g, '').toUpperCase();
                cleanName = cleanName.replace(/(?:\s*[-\s]\s*|\s*\(|\)\s*)(?:ITPL-?\d+|\(ITPL-?\d+\))/i, '').trim();
            }

            setDriverId(recognizedId || driver.ITPLId || cleanName);
            setDriverName(cleanName);
            setDriverMobile(mobileNumber);
        }
    }
    const handleBowserSelection = (bowser: ResponseBowser) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (bowser) {
            setBowserId(bowser._id);
            setBowserRegNo(bowser.regNo);
            setBowserDriverId(bowser.bowserDriver?.userId || '');
            setBowserDriverName(bowser.bowserDriver?.name || '');
            setBowserDriverMongoId(bowser.bowserDriver?._id);
        }
    }

    const searchBowserDriver = async (userId: string) => {
        setIsSearching(true);
        try {
            const response = await fetch(`https://bowser-backend-2cdr.onrender.com/searchDriver/bowser-drivers/${userId}`); //https://bowser-backend-2cdr.onrender.com

            if (!response.ok) {
                let errorMessage = 'An error occurred while searching for the bowser driver.';
                if (response.status === 404) {
                    errorMessage = 'No bowser driver found with the given ID.';
                }
                throw new Error(errorMessage);
            }

            const drivers: User[] = await response.json();
            setBowserDrivers(drivers);

            if (drivers.length === 0) {
            } else {
                setBowserDriverModalVisible(true);
            }
        } catch (error) {
            console.error('Error searching for bowser driver:', error);
            setBowserDrivers([]);
        } finally {
            setIsSearching(false);
        }
    }

    const handleBowserDriverSelection = (driver: User) => {
        setSelectedBowserDriver(driver);
        setBowserDriverModalVisible(false);

        if (driver) {
            setBowserDriverId(driver.userId);
            setBowserDriverName(driver.name);
        }
    }

    const handleVehicleSelection = (vehicle: Vehicle) => {
        setVehicleNumber(vehicle.VehicleNo);
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const currentUser = getCurrentUser();
        if (!currentUser) {
            console.error("User authentication failed");
            setAlertMessage("User not authenticated. Please log in again.");
            setAlertDialogOpen(true);
            setSubmitting(false);
            return;
        }

        const allocationData = {
            vehicleNumber,
            driverId,
            driverName,
            driverMobile,
            quantityType,
            fuelQuantity,
            bowser: {
                _id: bowserId,
                regNo: bowserRegNo,
                ref: 'Bowser'
            },
            bowserDriver: {
                _id: bowserDriverMongoId,
                userName: bowserDriverName,
                userId: bowserDriverId
            },
            allocationAdmin: {
                _id: currentUser._id,
                userName: currentUser.name,
                userId: currentUser.userId,
                location: adminLocation
            },
        };

        try {
            const response = await fetch('https://bowser-backend-2cdr.onrender.com/allocateFueling', { //https://bowser-backend-2cdr.onrender.com
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(allocationData),
            });

            const responseText = await response.text()

            if (!response.ok) {
                throw new Error(`Failed to allocate fueling: ${response.status} ${response.statusText}`);
            }

            const result = JSON.parse(responseText)

            setAlertMessage(result.message);
            setAlertDialogOpen(true);
        } catch (error) {
            console.error('Error allocating fueling:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                setAlertMessage(error.message);
            } else {
                console.error('Unknown error:', error);
                setAlertMessage('An unknown error occurred');
            }
            setAlertDialogOpen(true);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setVehicleNumber("")
        setDriverId("")
        setDriverName("")
        setDriverMobile("")
        setQuantityType("Part")
        setFuelQuantity("")
        setBowserDriverName("")
        setBowserDriverId("")
    }

    const handleQuantityTypeChange = (value: 'Full' | 'Part') => {
        setQuantityType(value);
        if (value === 'Full') {
            setFuelQuantity('0');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            {(submitting || isSearching) && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
            )}
            <Card className="w-[450px]">
                <CardHeader>
                    <CardTitle>Fuel Allocation</CardTitle>
                    <CardDescription>Allocate fueling requirements</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                                <Input
                                    id="vehicleNumber"
                                    placeholder="Enter vehicle number"
                                    value={vehicleNumber}
                                    onChange={(e) => {
                                        setVehicleNumber(e.target.value.toUpperCase());
                                        if (e.target.value.length > 5) {
                                            setFoundVehicles([]);
                                            searchVehicle(e.target.value.toUpperCase());
                                        }
                                    }}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="driverId">Driver ID</Label>
                                <Input
                                    id="driverId"
                                    placeholder="Enter driver ID"
                                    value={driverId}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setDriverId(value);
                                        if (value.length > 3) {
                                            searchDriver(value);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && driverId.length > 3) {
                                            e.preventDefault();
                                            searchDriver(driverId);
                                        }
                                    }}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="driverName">Driver Name</Label>
                                <Input
                                    id="driverName"
                                    placeholder="Enter driver name"
                                    value={driverName}
                                    onChange={(e) => setDriverName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="driverMobile">Driver Mobile</Label>
                                <Input
                                    id="driverMobile"
                                    placeholder="Enter driver mobile"
                                    value={driverMobile}
                                    onChange={(e) => setDriverMobile(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex space-x-4 my-6">
                                <div className="flex-[0.5]">
                                    <Label htmlFor="quantityType">Quantity Type</Label>
                                    <Select
                                        value={quantityType}
                                        onValueChange={(e) => handleQuantityTypeChange(e as "Full" | "Part")}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a quantity type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {/* <SelectLabel>Quantity Type</SelectLabel> */}
                                                <SelectItem value="Part">Part</SelectItem>
                                                <SelectItem value="Full">Full</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="fuelQuantity">Fuel Quantity</Label>
                                    <Input
                                        id="fuelQuantity"
                                        placeholder="Enter fuel quantity"
                                        value={fuelQuantity}
                                        onChange={(e) => setFuelQuantity(e.target.value)}
                                        required
                                        defaultValue={0}
                                        min={0}
                                        type="text"
                                        disabled={quantityType === 'Full'}
                                    />
                                </div>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold mt-4 mb-2">Allocate the order to:</h3>
                        <div className="flex flex-col space-y-1.5 mb-4">
                            <Label htmlFor="bowserRegNo">Bowser Registration Number</Label>
                            <Input
                                id="bowserRegNo"
                                placeholder="Enter bowser registration number"
                                value={bowserRegNo}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setBowserRegNo(value);
                                    if (value.length > 5) {
                                        searchBowser(value);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        searchBowser(bowserRegNo);
                                    }
                                }}
                                required
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="bowserDriverId">Bowser Driver ID</Label>
                            <Input
                                id="bowserDriverId"
                                placeholder="Enter bowser driver ID"
                                value={bowserDriverId}
                                required
                                readOnly
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5 mt-4">
                            <Label htmlFor="bowserDriverName">Bowser Driver Name</Label>
                            <Input
                                id="bowserDriverName"
                                placeholder="Enter bowser driver name"
                                value={bowserDriverName}
                                // onChange={(e) => setBowserDriverName(e.target.value)}
                                required
                                readOnly
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button disabled={submitting || isSearching} variant="outline" type="reset" className="w-[40%]" onClick={resetForm}>Clear</Button>
                        <Button disabled={submitting || isSearching} className="w-[50%]" variant="default" type="submit">
                            Allocate Fueling
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <SearchModal
                isOpen={searchModalConfig.isOpen}
                onClose={() => setSearchModalConfig((prev) => ({ ...prev, isOpen: false }))}
                title={searchModalConfig.title}
                items={searchModalConfig.items}
                onSelect={searchModalConfig.onSelect}
                renderItem={searchModalConfig.renderItem}
                keyExtractor={searchModalConfig.keyExtractor}
            />

            <Dialog open={bowserDriverModalVisible} onOpenChange={setBowserDriverModalVisible}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select a Bowser Driver</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-2">
                        {bowserDrivers.map((driver, index) => (
                            <Button
                                key={index}
                                className="w-full justify-start"
                                variant="outline"
                                onClick={() => handleBowserDriverSelection(driver)}
                            >
                                {driver.name} ({driver.userId})
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

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
    )
}
