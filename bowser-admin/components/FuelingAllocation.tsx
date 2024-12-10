/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, getCurrentUser, API_URL } from "@/lib/auth"
import { AttachedVehicle, Driver, FuelingTypes, ResponseBowser, User } from "@/types"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SearchModal } from "@/components/SearchModal"
import { searchItems } from '@/utils/searchUtils'
import { Vehicle } from "@/types"
import Loading from "@/app/loading"
import { BASE_URL } from "@/lib/api"
import { updateDriverMobile } from "@/utils"

export default function FuelingAllocation() {
    const [isSearching, setIsSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [vehicleNumber, setVehicleNumber] = useState("")
    const [partyName, setPartyName] = useState("Own")
    const [driverId, setDriverId] = useState("")
    const [driverName, setDriverName] = useState("")
    const [driverMobile, setDriverMobile] = useState("")
    const [fuelQuantity, setFuelQuantity] = useState('0')
    const [quantityType, setQuantityType] = useState<'Full' | 'Part'>('Full')
    const [bowserDriverName, setBowserDriverName] = useState("")
    const [bowserDriverId, setBowserDriverId] = useState("")
    const [bowserRegNo, setBowserRegNo] = useState("")
    const [bowserDriverMobile, setBowserDriverMobile] = useState<string>("")
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
    const [fueling, setFueling] = useState<FuelingTypes>('Own')

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (fueling == "Own") {
            setPartyName("Own")
        } else {
            setPartyName("")
        }
    }, [fueling])

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

    const searchBowser = async (bowser: string) => {
        setIsSearching(true);
        try {
            const response: ResponseBowser[] = await searchItems<ResponseBowser>(
                `${BASE_URL}/searchBowserDetails/trip`, //https://bowser-backend-2cdr.onrender.com
                bowser,
                `No proper details found with the given regNo ${bowser}`
            );
            if (response.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Bowser",
                    items: response,
                    onSelect: handleBowserSelection,
                    renderItem: (trip) => `${trip.tripSheetId} : Bowser: ${trip.bowser.regNo}\nDriver: ${trip.bowserDriver[0]?.name} (${trip.bowserDriver[0]?.phoneNo})`,
                    keyExtractor: (trip) => trip.bowser.regNo,
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
                    renderItem: (driver) => `${driver.name} (${driver.phoneNo})`,
                    keyExtractor: (driver) => driver.phoneNo,
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
                    renderItem: (vehicle) => `${vehicle.VehicleNo} - ${vehicle.tripDetails.driver?.Name}`,
                    keyExtractor: (vehicle) => vehicle.VehicleNo,
                });
            }
        } catch (error) {
            console.error('Error searching for vehicle:', error);
        } finally {
            setIsSearching(false);
        }
    }

    const searchAttatchedVehicle = async (vehicleNumber: string) => {
        setIsSearching(true);
        try {
            const vehicles = await searchItems<AttachedVehicle>(
                `${API_URL}/attatched/search`, //https://bowser-backend-2cdr.onrender.com
                vehicleNumber,
                'No vehicle found with the given number'
            );
            console.log(vehicles)
            if (vehicles.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Vehicle",
                    items: vehicles,
                    onSelect: handleAttachedVehicleSelection,
                    renderItem: (vehicle) => `${vehicle.VehicleNo} - ${vehicle.TransportPartenName}`,
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
            setBowserRegNo(bowser.bowser.regNo);
            setBowserDriverName(bowser.bowserDriver[0]?.name);
            setBowserDriverMobile(bowser.bowserDriver[0]?.phoneNo);
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
        setVehicleNumber(vehicle.VehicleNo);
        if (vehicle.tripDetails) {
            const idMatch = vehicle.tripDetails.driver.Name.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
            let cleanName = vehicle.tripDetails.driver.Name.trim();
            let recognizedId = '';
            if (idMatch) {
                recognizedId = idMatch[0].replace(/[()]/g, '').toUpperCase();
                cleanName = cleanName.replace(/(?:\s*[-\s]\s*|\s*\(|\)\s*)(?:ITPL-?\d+|\(ITPL-?\d+\))/i, '').trim();
            }

            setDriverId(recognizedId || vehicle.tripDetails.driver.id || cleanName);
            setDriverName(cleanName);

            if (vehicle.tripDetails.driver.MobileNo) {
                setDriverId(vehicle.tripDetails.driver.id || '');
                setDriverName(vehicle.tripDetails.driver.Name);
                setDriverMobile(vehicle.tripDetails.driver.MobileNo);
                setDriverMobileNotFound(false);
            } else {
                setDriverMobile('');
                setDriverMobileNotFound(true);
            }
        }
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));
    }

    const handleAttachedVehicleSelection = (vehicle: AttachedVehicle) => {
        setVehicleNumber(vehicle.VehicleNo);
        setPartyName(vehicle.TransportPartenName)
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

        if (driverMobileNotFound && driverMobile) {
            try {
                await updateDriverMobile(driverId, driverMobile);
            } catch (error) {
                setSubmitting(false);
                setAlertMessage("Failed to update driver mobile number. Please try again.");
                setAlertDialogOpen(true);
                return;
            }
        }

        const allocationData = {
            category: fueling,
            party: partyName,
            vehicleNumber,
            driverId,
            driverName,
            driverMobile,
            quantityType,
            fuelQuantity,
            bowser: {
                regNo: bowserRegNo,
                driver: {
                    name: bowserDriverName,
                    phoneNo: bowserDriverMobile
                }
            },
            allocationAdmin: {
                name: currentUser.name,
                id: currentUser.userId,
            },
        };

        try {
            const response = await fetch(`${BASE_URL}/allocateFueling`, { //https://bowser-backend-2cdr.onrender.com
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
        setPartyName("")
        setDriverId("")
        setDriverName("")
        setDriverMobile("")
        setQuantityType("Full")
        setFuelQuantity("0")
        setBowserRegNo('')
        setBowserDriverName("")
        setBowserDriverMobile("")
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
            <Card className="w-[450px] bg-">
                <CardHeader>
                    <CardTitle>Fuel Allocation</CardTitle>
                    <CardDescription>Allocate fueling requirements</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent>
                        {/* Nav for diffrent type */}
                        <div className="px-4 rounded-md flex justify-around my-6 mt-0 bg-card">
                            {(['Own', 'Attatch', 'Bulk Sale'] as FuelingTypes[]).map((option) => (
                                <Button
                                    type="button"
                                    key={option}
                                    variant={fueling === option ? "default" : "outline"}
                                    onClick={() => setFueling(option)}
                                >
                                    {option}
                                </Button>
                            ))}
                        </div>
                        <div className="grid w-full items-center gap-4">
                            {fueling !== "Bulk Sale" &&
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                                    <Input
                                        id="vehicleNumber"
                                        placeholder="4576"
                                        value={vehicleNumber}
                                        onChange={(e) => {
                                            setVehicleNumber(e.target.value.toUpperCase());
                                            if (fueling == "Own") {
                                                if (e.target.value.length > 3) {
                                                    searchVehicle(e.target.value);
                                                }
                                            } else {
                                                if (e.target.value.length > 3) {
                                                    searchAttatchedVehicle(e.target.value)
                                                }
                                            }
                                        }}
                                        required
                                    />
                                </div>}
                            {fueling !== "Own" &&
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="partyName">{fueling == "Attatch" ? "Vendor" : "Party"} Name</Label>
                                    <Input
                                        id="partyName"
                                        placeholder="Flipkart"
                                        value={partyName}
                                        onChange={(e) => {
                                            setPartyName(e.target.value.toUpperCase());
                                        }}
                                        required
                                    />
                                </div>}
                            {fueling == "Own" && <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="driverId">Driver ID</Label>
                                <Input
                                    id="driverId"
                                    placeholder="0246"
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
                            </div>}
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="driverName">{(fueling == "Own" || fueling == "Attatch") ? "Driver" : "Manager"} Name</Label>
                                <Input
                                    id="driverName"
                                    placeholder="Dinesh"
                                    value={driverName}
                                    onChange={(e) => setDriverName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="driverMobile">{(fueling == "Own" || fueling == "Attatch") ? "Driver" : "Manager"} Mobile</Label>
                                <Input
                                    id="driverMobile"
                                    placeholder="0123456789"
                                    value={driverMobile}
                                    onChange={(e) => setDriverMobile(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex space-x-4 my-6">
                                <div className="flex-1">
                                    <Label htmlFor="quantityType">Quantity Type</Label>
                                    <RadioGroup className="flex gap-4 mt-4" defaultValue={quantityType} onValueChange={(e) => handleQuantityTypeChange(e as "Full" | "Part")}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Full" id="option-two" />
                                            <Label htmlFor="option-two">Full</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Part" id="option-one" />
                                            <Label htmlFor="option-one">Part</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className={`${quantityType == 'Full' ? "hidden" : "flex-1"}`}>
                                    <Label htmlFor="fuelQuantity">Fuel Quantity</Label>
                                    <Input
                                        id="fuelQuantity"
                                        placeholder="240"
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
                                placeholder="2003"
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
                        <div className="flex flex-col space-y-1.5 mt-4">
                            <Label htmlFor="bowserDriverName">Bowser Driver Name</Label>
                            <Input
                                id="bowserDriverName"
                                placeholder="Sunil/ 0123456789"
                                value={bowserDriverName}
                                required
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setBowserDriverName(value);
                                    if (value.length > 3) {
                                        searchBowserDriver(value);
                                        if (value.length > 3) {
                                            searchBowserDriver(bowserDriverName);
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
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5 mt-4">
                            <Label htmlFor="bowserDriverPhone">Bowser Driver Mobile</Label>
                            <Input
                                id="bowserDriverPhone"
                                placeholder="0123456789"
                                value={bowserDriverMobile}
                                required
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
