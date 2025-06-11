/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, getCurrentUser } from "@/lib/auth"
import { AttachedVehicle, Driver, FuelingTypes, User, VehicleWithTrip } from "@/types"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SearchModal } from "@/components/SearchModal"
import { searchItems } from '@/utils/searchUtils'
import { Vehicle } from "@/types"
import Loading from "@/app/loading"
import { BASE_URL } from "@/lib/api"
import { updateDriverMobile, updateTripDriver } from "@/utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./ui/select"
import { ComboboxOption } from "./Combobox"
import ComboBox from "./Combobox"

export interface SearchParams {
    vehicleNumber: string
    odoMeter: string
    tripId: string
    driverId: string
    driverName: string
    driverMobile: string
    id: string
    orderId: string
    category: "Own" | "Attatch" | "Bulk Sale"
    party: string
    partyName: string
    odometer: string
    quantityType: 'Full' | 'Part'
    fuelQuantity: string
    pumpAllocationType: 'Any' | 'Specific'
    allocationType: string
    bowserDriverName: string
    bowserDriverMobile: string
    bowserRegNo: string
    fuelProvider: string
    petrolPump: string
    fuelStation: string
    editing: boolean,
}

const FuelingAllocation = ({ searchParams }: { searchParams: SearchParams }) => {
    const paramsVehicleNumber = searchParams.vehicleNumber;
    const paramsOdoMeter = searchParams.odoMeter;
    const paramsTripId = searchParams.tripId;
    const paramsDriverId = searchParams.driverId;
    const paramsDriverName = searchParams.driverName;
    const paramsDriverMobile = searchParams.driverMobile;
    const requestId = searchParams.id;
    const allocationType = searchParams.allocationType || "bowser";
    const orderId = searchParams.orderId;
    const paramsCategory = searchParams.category;
    const paramsPartyName = searchParams.partyName;
    const paramsQuantityType = searchParams.quantityType;
    const paramsFuelQuantity = searchParams.fuelQuantity;
    const paramsPumpAllocationType = searchParams.pumpAllocationType;
    const paramsBowserDriverName = searchParams.bowserDriverName;
    const paramsBowserDriverMobile = searchParams.bowserDriverMobile;
    const paramsBowserRegNo = searchParams.bowserRegNo;
    const paramsFuelProvider = searchParams.fuelProvider;
    const paramsPetrolPump = searchParams.petrolPump;
    const editing = searchParams.editing;

    const [isSearching, setIsSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [vehicleNumber, setVehicleNumber] = useState(paramsVehicleNumber)
    const [partyName, setPartyName] = useState(paramsPartyName || "Own")
    const [driverId, setDriverId] = useState(paramsDriverId)
    const [driverName, setDriverName] = useState(paramsDriverName)
    const [driverMobile, setDriverMobile] = useState(paramsDriverMobile)
    const [fuelQuantity, setFuelQuantity] = useState(paramsFuelQuantity || '0')
    const [quantityType, setQuantityType] = useState<'Full' | 'Part'>(paramsQuantityType || 'Full')
    const [pumpAllocationType, setPumpAllocationType] = useState<'Any' | 'Specific'>(paramsPumpAllocationType || 'Any')
    const [bowserDriverName, setBowserDriverName] = useState(paramsBowserDriverName || "")
    const [bowserDriverId, setBowserDriverId] = useState(paramsBowserDriverMobile || "")
    const [bowserRegNo, setBowserRegNo] = useState(paramsBowserRegNo || "")
    const [bowserDriverMobile, setBowserDriverMobile] = useState<string>(paramsBowserDriverMobile || "")
    const [fuelProvider, setFuelProvider] = useState<string>(paramsFuelProvider || "Reliance")
    const [search, setSearch] = useState<string>("")
    const [fuelProviders, setFuelProviders] = useState<ComboboxOption[]>([])
    const [petrolPump, setPetrolPump] = useState<string>(paramsPetrolPump || "")
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
    const [fueling, setFueling] = useState<FuelingTypes>(paramsCategory || 'Own')

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };

    const fetchFuelProviders = async () => {
        if (allocationType && allocationType === 'external') {
            try {
                const response = await fetch(`${BASE_URL}/fuel-station?name=${search}`);
                const data = await response.json();
                const formattedData: ComboboxOption[] = data.map((item: { _id: string, name: string }) => ({
                    value: item.name,
                    label: item.name
                }));
                setFuelProviders(formattedData);
            } catch (error) {
                console.error('Error fetching fuel providers:', error);
            }
        }
    }

    useEffect(() => {
        fetchFuelProviders();
    }, [search]);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (fueling == "Own") {
            setPartyName("Own")
        } else if (fueling == "Bulk Sale") {
            setQuantityType("Part")
        }
        else {
            setPartyName("")
        }
    }, [fueling])

    const searchDriver = async (idNumber: string) => {
        setIsSearching(true);
        try {
            const drivers = await searchItems<Driver>({
                url: `${BASE_URL}/searchDriver`,
                searchTerm: idNumber,
                errorMessage: 'No driver found with the given ID'
            });
            if (drivers.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Driver",
                    items: drivers,
                    onSelect: handleDriverSelection,
                    renderItem: (driver) => `${driver.Name}, ${driver.MobileNo.find((num: { LastUsed: boolean }) => num.LastUsed)?.MobileNo || "No Last Used Mobile No."}`,
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
            const response: User[] = await searchItems<User>({
                url: `${BASE_URL}/users?searchParam=${bowser}`,
                errorMessage: `No proper details found with the given parameter: ${bowser}`
            });
            if (response.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Bowser",
                    items: response,
                    onSelect: handleBowserSelection,
                    renderItem: (driver) => `Bowser: ${driver.bowserId || "Not Found"}\n Driver: ${driver.name} (${driver.phoneNumber})`,
                    keyExtractor: (driver) => driver.phoneNumber,
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
            const response = await searchItems({ url: `${BASE_URL}/searchDriver/bowser-drivers`, searchTerm: userId, errorMessage: `No details found with the user id: ${userId}` })// fetch(`https://bowser-backend-2cdr.onrender.com/searchDriver/bowser-drivers/${userId}`); //https://bowser-backend-2cdr.onrender.com
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
            const vehicles = await searchItems<Vehicle>({
                url: `${BASE_URL}/searchVehicleNumber`,
                searchTerm: vehicleNumber,
                errorMessage: 'No vehicle found with the given number'
            });
            if (vehicles.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Vehicle",
                    items: vehicles,
                    onSelect: handleVehicleSelection,
                    renderItem: (vehicle) => `${vehicle.VehicleNo} - ${vehicle.tripDetails.driver?.name} - ${vehicle.tripDetails.driver?.mobile}`,
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
            const vehicles = await searchItems<AttachedVehicle>({
                url: `${BASE_URL}/attatched/search`,
                searchTerm: vehicleNumber,
                errorMessage: 'No vehicle found with the given number'
            });
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

                setDriverMobile(mobileNumber);
                setDriverMobileNotFound(false);
            } else {
                setDriverMobile('');
                setDriverMobileNotFound(true);
            }
        }
    }
    const handleBowserSelection = (driver: User) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (driver) {
            setBowserRegNo(driver.bowserId);
            setBowserDriverName(driver.name);
            setBowserDriverMobile(driver.phoneNumber);
        }
    }

    const handleBowserDriverSelection = (driver: User) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (driver) {
            setBowserDriverId(driver.userId);
            setBowserDriverName(driver.name);
        }
    }

    const handleVehicleSelection = (vehicle: VehicleWithTrip) => {
        setVehicleNumber(vehicle.VehicleNo);
        if (vehicle.tripDetails) {
            const idMatch = vehicle.tripDetails.driver.name.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
            let cleanName = vehicle.tripDetails.driver.name.trim();
            let recognizedId = '';
            if (idMatch) {
                recognizedId = idMatch[0].replace(/[()]/g, '').toUpperCase();
                cleanName = cleanName.replace(/(?:\s*[-\s]\s*|\s*\(|\)\s*)(?:ITPL-?\d+|\(ITPL-?\d+\))/i, '').trim();
            }

            setDriverId(recognizedId || vehicle.tripDetails.driver.id || cleanName);
            setDriverName(cleanName);

            if (vehicle.tripDetails.driver.mobile) {
                setDriverMobile(vehicle.tripDetails.driver.mobile);
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

    const handleUpdateMobile = async () => {
        setSubmitting(true);
        try {
            await updateDriverMobile(driverId, driverMobile);
        } catch (error) {
            setAlertMessage("Failed to update driver mobile number. Please try again.");
            setAlertDialogOpen(true);
            return;
        } finally {
            setSubmitting(false);
        }
    }

    const handleUpdateTrip = async () => {
        setSubmitting(true);
        try {
            await updateTripDriver(vehicleNumber, `${driverName + "-" + driverId}`)
        } catch (error) {
            setAlertMessage("Failed to update trip details. Please try again.");
            setAlertDialogOpen(true);
            return;
        } finally {
            setSubmitting(false);
        }
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
            allocationType,
            category: fueling,
            party: partyName,
            vehicleNumber,
            ...(paramsOdoMeter && paramsOdoMeter.trim() !== '') && { odometer: paramsOdoMeter },
            ...(paramsTripId && paramsTripId.trim() !== '' && { tripId: paramsTripId }),
            driverId,
            driverName,
            driverMobile,
            quantityType,
            fuelQuantity,
            ...(allocationType === "external" && {
                pumpAllocationType,
                fuelProvider,
                petrolPump,
            }),
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
            requestId
        };

        try {
            const url = editing ? `${BASE_URL}/allocateFueling/update/${orderId}` : `${BASE_URL}/allocateFueling`;
            const response = await fetch(url, {
                method: editing ? 'PATCH' : 'POST',
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
    const handlePumpAllocationTypeChange = (value: 'Any' | 'Specific') => {
        setPumpAllocationType(value);
    };

    return (
        <div className="flex justify-center items-center bg-background py-4 min-h-full">
            {(submitting || isSearching) && (
                <Loading />
            )}
            <Card className="bg- w-[450px]">
                <CardHeader>
                    <CardTitle>Fuel Allocation</CardTitle>
                    <CardDescription>Allocate fueling requirements</CardDescription>
                </CardHeader>
                <Accordion type="single" collapsible className="mb-2 p-4 w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="mb-2 w-full text-left">Update Details?</AccordionTrigger>
                        <AccordionContent>
                            <div className="flex justify-around items-center">
                                <Button onClick={() => handleUpdateMobile()} variant="outline">Driver Mobile</Button>
                                <Button onClick={() => handleUpdateTrip()} variant="outline">Trip Driver</Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <form onSubmit={handleSubmit}>
                    <CardContent>
                        {/* Nav for diffrent type */}
                        <div className="flex justify-around bg-card my-6 mt-0 px-4 rounded-md">
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
                        <div className="items-center gap-4 grid w-full">
                            {fueling !== "Bulk Sale" &&
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                                    <Input
                                        id="vehicleNumber"
                                        value={vehicleNumber}
                                        onChange={(e: any) => {
                                            setVehicleNumber(e.target.value.toUpperCase());
                                            const nativeEvent = e.nativeEvent as InputEvent;
                                            if (nativeEvent.inputType === "insertText" && e.currentTarget.value.length > 3) {
                                                if (e.nativeEvent.data) {
                                                    if (fueling == "Own") {
                                                        if (e.target.value.length > 3) {
                                                            searchVehicle(e.target.value);
                                                        }
                                                    } else {
                                                        if (e.target.value.length > 3) {
                                                            searchAttatchedVehicle(e.target.value)
                                                        }
                                                    }
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
                                    value={driverId}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setDriverId(value);
                                        const nativeEvent = e.nativeEvent as InputEvent;
                                        if (nativeEvent.inputType === "insertText" && e.currentTarget.value.length > 3) {
                                            searchDriver(value);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Backspace") {
                                            return;
                                        }
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
                                    value={driverName}
                                    onChange={(e) => setDriverName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="driverMobile">{(fueling == "Own" || fueling == "Attatch") ? "Driver" : "Manager"} Mobile</Label>
                                <Input
                                    id="driverMobile"
                                    value={driverMobile}
                                    onChange={(e) => setDriverMobile(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex space-x-4 my-6">
                                <div className={`${fueling == "Bulk Sale" ? "hidden" : "flex-1"}`}>
                                    <h3>Quantity Type</h3>
                                    <RadioGroup name="quantityType" className="flex gap-4 mt-4" defaultValue={quantityType} onValueChange={(e) => handleQuantityTypeChange(e as "Full" | "Part")}>
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
                        <h3 className="mt-4 mb-2 font-semibold text-lg">Allocate the order to {allocationType === "bowser" ? "Bowser" : "Petrol Pump"}:</h3>
                        {allocationType === "bowser" &&
                            <>
                                <div className="flex flex-col space-y-1.5 mb-4">
                                    <Label htmlFor="bowserRegNo">Bowser Registration Number</Label>
                                    <Input
                                        id="bowserRegNo"
                                        placeholder="Bowser number/driver name/mobile"
                                        value={bowserRegNo}
                                        onChange={(e: any) => {
                                            setBowserRegNo(e.target.value);
                                            const nativeEvent = e.nativeEvent as InputEvent;
                                            if (nativeEvent.inputType === "insertText" && e.currentTarget.value.length > 3 && e.nativeEvent.data && e.target.value.length > 3) {
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
                                        value={bowserDriverName}
                                        required
                                        onChange={(e) => {
                                            setBowserDriverName(e.target.value);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Backspace") {
                                                return;
                                            }
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
                                        value={bowserDriverMobile}
                                        onChange={(e) => setBowserDriverMobile(e.target.value)}
                                        required
                                    />
                                </div>
                            </>
                        }
                        {allocationType === "external" && <Select onValueChange={setFuelProvider} value={fuelProvider}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a Fuel Provider" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* map companies like reliance, iocl, bpcl, hpcl */}
                                <SelectItem value="Reliance">Reliance</SelectItem>
                                <SelectItem value="IOCL">IOCL</SelectItem>
                                <SelectItem value="HPCL">HPCL</SelectItem>
                                <SelectItem value="BPCL">BPCL</SelectItem>
                            </SelectContent>
                        </Select>}
                        {allocationType === "external" &&
                            <>
                                <RadioGroup required={allocationType === "external"} name="pumpAllocationType" className="flex gap-4 mt-4" defaultValue={pumpAllocationType} onValueChange={(e) => handlePumpAllocationTypeChange(e as "Any" | "Specific")}>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Any" id="any" />
                                        <Label htmlFor="any">Any Petrol Pump</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Specific" id="specific" />
                                        <Label htmlFor="specific">Specific Petrol Pump</Label>
                                    </div>
                                </RadioGroup>
                            </>
                        }
                        {allocationType === "external" && pumpAllocationType === "Specific" &&
                            <ComboBox
                                className="w-full mt-3"
                                options={fuelProviders}
                                value={petrolPump}
                                onChange={setPetrolPump}
                                searchTerm={search}
                                onSearchTermChange={setSearch}
                            />
                        }
                        {allocationType === "internal" &&
                            <>
                                <div className="flex flex-col space-y-1.5 mb-4">
                                    <Label htmlFor="bowserRegNo">Machine</Label>
                                    <Input
                                        className="placeholder:text-muted-foreground"
                                        id="bowserRegNo"
                                        placeholder="Machine-1"
                                        value={bowserRegNo}
                                        onChange={(e: any) => {
                                            setBowserRegNo(e.target.value);
                                            const nativeEvent = e.nativeEvent as InputEvent;
                                            if (nativeEvent.inputType === "insertText" && e.currentTarget.value.length > 3 && e.nativeEvent.data && e.target.value.length > 3) {
                                                searchBowser(bowserRegNo);
                                            }
                                        }}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col space-y-1.5 mt-4">
                                    <Label htmlFor="bowserDriverName">Office</Label>
                                    <Input
                                        id="bowserDriverName"
                                        value={bowserDriverName}
                                        required
                                        onChange={(e) => {
                                            setBowserDriverName(e.target.value);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Backspace") {
                                                return;
                                            }
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
                                    <Label htmlFor="bowserDriverPhone">Office Contact Mobile</Label>
                                    <Input
                                        id="bowserDriverPhone"
                                        value={bowserDriverMobile}
                                        onChange={(e) => setBowserDriverMobile(e.target.value)}
                                        required
                                    />
                                </div>
                            </>
                        }
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button disabled={submitting || isSearching} variant="outline" type="reset" className="w-[40%]" onClick={resetForm}>Clear</Button>
                        <Button disabled={submitting || isSearching} className="w-[50%]" variant="default" type="submit">
                            {editing ? "Update Allocation" : "Allocate Fueling"}
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

export default FuelingAllocation;