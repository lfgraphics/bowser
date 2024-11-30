/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, getCurrentUser } from "@/lib/auth"
import { Driver, ResponseBowser, User } from "@/types"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
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
import Loading from "@/app/loading"
import { BASE_URL } from "@/lib/api"

export default function FuelingAllocation() {
    const [isSearching, setIsSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [vehicleNumber, setVehicleNumber] = useState("")
    const [driverId, setDriverId] = useState("")
    const [driverName, setDriverName] = useState("")
    const [driverMobile, setDriverMobile] = useState("")
    const [fuelQuantity, setFuelQuantity] = useState('0')
    const [quantityType, setQuantityType] = useState<'Full' | 'Part'>('Full')
    const [bowserDriverName, setBowserDriverName] = useState("")
    const [bowserDriverId, setBowserDriverId] = useState("")
    const [bowserRegNo, setBowserRegNo] = useState("")
    const [tripSheetId, setTripSheetId] = useState("")
    const [bowserDriverMongoId, setBowserDriverMongoId] = useState<ObjectId>()
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
    const [driverMobileNotFound, setDriverMobileNotFound] = useState(false);

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);

    const searchDriver = async (idNumber: string) => {
        setIsSearching(true);
        try {
            const drivers = await searchItems<Driver>(
                'https://bowser-backend-2cdr.onrender.com/searchDriver', //https://bowser-backend-2cdr.onrender.com
                idNumber,
                'No driver found with the given ID'
            );
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
            console.error('Error searching for driver:', error);
        } finally {
            setIsSearching(false);
        }
    }
    const searchBowser = async (regNo: string) => {
        setIsSearching(true);
        try {
            const response: ResponseBowser[] = await searchItems<ResponseBowser>(
                `${BASE_URL}/searchBowserDetails/trip`, //https://bowser-backend-2cdr.onrender.com
                regNo,
                `No proper details found with the given regNo ${regNo}`
            );
            if (response.bowserDetails.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Bowser",
                    items: response.bowserDetails,
                    onSelect: handleBowserSelection,
                    renderItem: (bowser) => `${bowser.tripSheetId} : Bowser: ${bowser.regNo}\nDriver: ${bowser.bowserDriver.name} (${bowser.bowserDriver.id})`,
                    keyExtractor: (bowser) => bowser.regNo,
                });
            }
        } catch (error) {
            console.error('Error searching for driver:', error);
        } finally {
            setIsSearching(false);
        }
    }

    const searchBowserDriver = async (userId: string) => {
        setIsSearching(true);
        try {
            const response = await searchItems('https://bowser-backend-2cdr.onrender.com/searchDriver/bowser-drivers', userId, `No details found with the user id: ${userId}`)// fetch(`https://bowser-backend-2cdr.onrender.com/searchDriver/bowser-drivers/${userId}`); //https://bowser-backend-2cdr.onrender.com
            const drivers = response;
            if (drivers.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Bowser Driver",
                    items: drivers,
                    onSelect: handleBowserDriverSelection,
                    renderItem: (driver) => `${driver.name} (${driver.id})`,
                    keyExtractor: (driver) => driver.id,
                });
            }
        } catch (error) {
            console.error('Error searching for bowser driver:', error);
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
            console.log(vehicles)
            if (vehicles.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Vehicle",
                    items: vehicles,
                    onSelect: handleVehicleSelection,
                    renderItem: (vehicle) => `${vehicle.vehicleNo} - ${vehicle.driverDetails?.Name}`,
                    keyExtractor: (vehicle) => vehicle.VehicleNo,
                });
            }
        } catch (error) {
            console.error('Error searching for vehicle:', error);
        } finally {
            setIsSearching(false);
        }
    }

    const handleDriverSelection = (driver: Driver) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (driver) {
            const idMatch = driver.Name.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
            let cleanName = driver.Name.trim();
            let recognizedId = '';
            if (idMatch) {
                recognizedId = idMatch[0].replace(/[()]/g, '').toUpperCase();
                cleanName = cleanName.replace(/(?:\s*[-\s]\s*|\s*\(|\)\s*)(?:ITPL-?\d+|\(ITPL-?\d+\))/i, '').trim();
            }

            setDriverId(recognizedId || driver.ITPLId || cleanName);
            setDriverName(cleanName);

            if (driver.MobileNo && driver.MobileNo.length > 0) {
                const lastUsedNumber = driver.MobileNo.find(num => num.LastUsed);
                const defaultNumber = driver.MobileNo.find(num => num.IsDefaultNumber);
                const firstNumber = driver.MobileNo[0];
                const mobileNumber = (lastUsedNumber || defaultNumber || firstNumber)?.MobileNo || '';

                setDriverId(driver.ITPLId || '');
                setDriverName(driver.Name);
                setDriverMobile(mobileNumber);
                setDriverMobileNotFound(false);
            } else {
                setDriverMobile('');
                setDriverMobileNotFound(true);
            }
        }
    }
    const handleBowserSelection = (bowser: ResponseBowser) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (bowser) {
            setTripSheetId(bowser.tripSheetId);
            setBowserRegNo(bowser.regNo);
            setBowserDriverId(bowser.bowserDriver?.id || '');
            setBowserDriverName(bowser.bowserDriver?.name || '');
            setBowserDriverMongoId(bowser.bowserDriver?._id);
        }
    }

    const handleBowserDriverSelection = (driver: User) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (driver) {
            setBowserDriverId(driver.userId);
            setBowserDriverName(driver.name);
        }
    }

    const handleVehicleSelection = (vehicle: Vehicle) => {
        setVehicleNumber(vehicle.vehicleNo);
        if (vehicle.driverDetails) {
            const idMatch = vehicle.driverDetails.Name.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
            let cleanName = vehicle.driverDetails.Name.trim();
            let recognizedId = '';
            if (idMatch) {
                recognizedId = idMatch[0].replace(/[()]/g, '').toUpperCase();
                cleanName = cleanName.replace(/(?:\s*[-\s]\s*|\s*\(|\)\s*)(?:ITPL-?\d+|\(ITPL-?\d+\))/i, '').trim();
            }

            setDriverId(recognizedId || vehicle.driverDetails.ITPLId || cleanName);
            setDriverName(cleanName);

            if (vehicle.driverDetails.MobileNo && vehicle.driverDetails.MobileNo.length > 0) {
                const lastUsedNumber = vehicle.driverDetails.MobileNo.find(num => num.LastUsed);
                const defaultNumber = vehicle.driverDetails.MobileNo.find(num => num.IsDefaultNumber);
                const firstNumber = vehicle.driverDetails.MobileNo[0];
                const mobileNumber = (lastUsedNumber || defaultNumber || firstNumber)?.MobileNo || '';

                setDriverId(vehicle.driverDetails.ITPLId || '');
                setDriverName(vehicle.driverDetails.Name);
                setDriverMobile(mobileNumber);
                setDriverMobileNotFound(false);
            } else {
                setDriverMobile('');
                setDriverMobileNotFound(true);
            }
        }
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));
    }

    const updateDriverMobile = async () => {
        try {
            const response = await fetch('https://bowser-backend-2cdr.onrender.com/searchDriver/updateDriverMobile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ driverId, driverMobile }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update driver mobile number: ${response.status}`);
            }

            const result = await response.json();
            setAlertMessage(result.message);
            setAlertDialogOpen(true);
        } catch (error) {
            console.error('Error updating driver mobile number:', error);
            throw error;
        }
    };

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

        if (driverMobileNotFound && driverMobile) {
            try {
                await updateDriverMobile();
            } catch (error) {
                setSubmitting(false);
                setAlertMessage("Failed to update driver mobile number. Please try again.");
                setAlertDialogOpen(true);
                return;
            }
        }

        const allocationData = {
            vehicleNumber,
            tripSheetId,
            driverId,
            driverName,
            driverMobile,
            quantityType,
            fuelQuantity,
            bowser: {
                regNo: bowserRegNo,
                driver: {
                    name: bowserDriverName,
                    id: bowserDriverId,
                    phoneNo: driverMobile
                }
            },
            bowserDriver: {
                _id: bowserDriverMongoId,
                name: bowserDriverName,
            },
            allocationAdmin: {
                _id: currentUser._id,
                name: currentUser.name,
                id: currentUser.userId,
            },
        };

        console.log(allocationData)

        try {
            const response = await fetch('https://bowser-backend-2cdr.onrender.com/allocateFueling', { //https://bowser-backend-2cdr.onrender.com
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(allocationData),
            });

            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(`Failed to allocate fueling: ${response.status} ${response.statusText}`);
            }

            console.log(response)

            const result = JSON.parse(responseText);
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
        setQuantityType("Full")
        setFuelQuantity("0")
        setBowserRegNo('')
        setBowserDriverName("")
        setBowserDriverId("")
        setDriverMobileNotFound(false)
    }

    const handleQuantityTypeChange = (value: 'Full' | 'Part') => {
        setQuantityType(value);
        if (value === 'Full') {
            setFuelQuantity('0');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-full bg-background py-4">
            {(submitting || isSearching) && (
                <Loading />
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
                                        if (e.target.value.length > 3) {
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
                                required
                            />
                        </div>
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
                                        if (value.length > 3) {
                                            searchBowserDriver(bowserDriverId);
                                        }
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && bowserDriverId.length > 3) {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            searchBowserDriver(bowserDriverId);
                                        }
                                    }
                                }}
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
                                onChange={(e) => setBowserDriverName(e.target.value)}
                                required
                                readOnly
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" type="reset" className="w-[40%]" onClick={resetForm}>Clear</Button>
                        {/* //={submitting || isSearching} */}
                        <Button disabled className="w-[50%]" variant="default" type="submit">
                            {/* //={submitting || isSearching} */}
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
