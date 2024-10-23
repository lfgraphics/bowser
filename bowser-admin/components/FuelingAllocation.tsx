"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, getCurrentUser } from "@/lib/auth"
import { Driver, User } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

export default function FuelingAllocation() {
    const [isSearching, setIsSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [foundDrivers, setFoundDrivers] = useState<Driver[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [vehicleNumber, setVehicleNumber] = useState("")
    const [driverId, setDriverId] = useState("")
    const [driverName, setDriverName] = useState("")
    const [driverMobile, setDriverMobile] = useState("")
    const [fuelQuantity, setFuelQuantity] = useState('0')
    const [quantityType, setQuantityType] = useState<'Full' | 'Part'>('Full')
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [bowserDriverName, setBowserDriverName] = useState("")
    const [bowserDriverId, setBowserDriverId] = useState("")
    const [bowserDrivers, setBowserDrivers] = useState<User[]>([]);
    const [selectedBowserDriver, setSelectedBowserDriver] = useState<User | null>(null);
    const [bowserDriverModalVisible, setBowserDriverModalVisible] = useState(false);
    const router = useRouter()
    const [adminLocation, setAdminLocation] = useState('');
    const [alertDialogOpen, setAlertDialogOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");

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
            const response = await fetch(`${process.env.API_URL}/searchDriver/${idNumber}`);

            if (!response.ok) {
                if (response.status === 404) {
                    setFoundDrivers([]);
                    return;
                }
                throw new Error('Server error');
            }

            const drivers: Driver[] = await response.json();
            setFoundDrivers(drivers);

            if (drivers.length === 0) {
            } else {
                setModalVisible(true);
            }
        } catch (error) {
            console.error('Error searching for driver:', error);
            setFoundDrivers([]);
        } finally {
            setIsSearching(false);
        }
    }

    const handleDriverSelection = (driver: Driver) => {
        setSelectedDriver(driver);
        setModalVisible(false);

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

    const searchBowserDriver = async (userId: string) => {
        setIsSearching(true);
        try {
            const response = await fetch(`${process.env.API_URL}/searchDriver/bowser-drivers/${userId}`);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (!isAuthenticated()) {
            alert("You must be logged in to allocate fueling.");
            setSubmitting(false);
            return;
        }

        const currentUser = getCurrentUser();
        if (!currentUser || !selectedDriver || !selectedBowserDriver) {
            alert("User information, driver details, or bowser driver details are missing.");
            setSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`${process.env.API_URL}/allocateFueling`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                },
                body: JSON.stringify({
                    vehicleNumber,
                    driverId,
                    driverName,
                    driverMobile,
                    quantityType,
                    fuelQuantity: parseFloat(fuelQuantity),
                    bowserDriver: {
                        _id: selectedBowserDriver._id,
                        userName: selectedBowserDriver.name,
                        userId: selectedBowserDriver.userId
                    },
                    allocationAdmin: {
                        _id: currentUser._id,
                        userName: currentUser.name,
                        userId: currentUser.userId,
                        location: adminLocation,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setAlertMessage(result.message);
            setAlertDialogOpen(true);
            alert("Fueling allocation created successfully.");
            // Don't reset the form immediately, we'll do it after closing the alert dialog
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(error instanceof Error ? error.message : "An unexpected error occurred while allocating fueling.");
        } finally {
            setSubmitting(false);
        }
    }

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
            {submitting || isSearching && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
            )}
            <Card className="w-[450px]">
                <CardHeader>
                    <CardTitle>Fueling Allocation</CardTitle>
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
                                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
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
                                    <select
                                        id="quantityType"
                                        value={quantityType}
                                        onChange={(e) => handleQuantityTypeChange(e.target.value as 'Full' | 'Part')}
                                        className="form-select mt-2 block w-full bg-transparent"
                                    >
                                        <option className="bg-white text-black" value="Part">Part</option>
                                        <option className="bg-white text-black" value="Full">Full</option>
                                    </select>
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
                                        type="number"
                                        disabled={quantityType === 'Full'}
                                    />
                                </div>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold mt-4 mb-2">Allocate the order to:</h3>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="bowserDriverId">Bowser Driver ID</Label>
                            <Input
                                id="bowserDriverId"
                                placeholder="Enter bowser driver ID"
                                value={bowserDriverId}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setBowserDriverId(value);
                                    if (value.length > 3) {
                                        searchBowserDriver(value);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && bowserDriverId.length > 3) {
                                        e.preventDefault();
                                        searchBowserDriver(bowserDriverId);
                                    }
                                }}
                                required
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5 mt-4">
                            <Label htmlFor="bowserDriverName">Bowser Driver Name</Label>
                            <Input
                                id="bowserDriverName"
                                placeholder="Enter bowser driver name"
                                value={bowserDriverName}
                                onChange={(e) => setBowserDriverName(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button disabled={submitting || isSearching} variant="outline" className="w-[40%]" onClick={resetForm}>Clear</Button>
                        <Button disabled={submitting || isSearching} className="w-[50%]" variant="default" type="submit">
                            Allocate Fueling
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Dialog open={modalVisible} onOpenChange={setModalVisible}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select a Driver</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-2">
                        {foundDrivers.map((driver, index) => (
                            <Button
                                key={index}
                                className="w-full justify-start"
                                variant="outline"
                                onClick={() => handleDriverSelection(driver)}
                            >
                                {driver.Name}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

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
