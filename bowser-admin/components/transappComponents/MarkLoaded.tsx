import React, { useEffect, useState } from 'react'

import { format } from 'date-fns'
import { toast } from 'sonner'

import Loading from '@/app/loading'
import { BASE_URL } from '@/lib/api'
import { Driver, TankersTrip, TransAppUser } from '@/types'
import { getLocalDateTimeString } from '@/utils'
import { searchItems } from '@/utils/searchUtils'

import Combobox, { ComboboxOption } from '../Combobox'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { SearchModal } from '../SearchModal'
import { CustomerFormData } from './CustomerForm'

interface MarkLoadedProps {
    selectedTrip: TankersTrip
}

const MarkLoaded = ({ selectedTrip }: MarkLoadedProps) => {
    const [loading, setLoading] = useState(false);
    const [driverMobile, setDriverMobile] = useState("")
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
    const [search, setSearch] = useState<string>("")
    const [stackHolders, setStackHolders] = useState<ComboboxOption[]>([])
    const [fullStackHolders, setFullStackHolders] = useState<CustomerFormData[]>([])
    const [stackHolder, setStackHolder] = useState<string>("")
    const [Driver, setDriver] = useState<string>("");
    const [targetTime, setTargetTime] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [loadDate, setLoadDate] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [odometer, setOdometer] = useState<number | undefined>(undefined)
    const [qty, setQty] = useState<number | undefined>(undefined)
    const [orderedBy, setOrderedBy] = useState<string>("")
    const [proposedBy, setProposedBy] = useState<string>("")
    const [ManagerComment, setManagerComment] = useState<string>("")
    const [location, setLocation] = useState<string | undefined>("")
    const [isConfirmationDialogueOpen, setIsConfirmationDialogueOpen] = useState<boolean>(false)
    const [goodsSearch, setGoodsSearch] = useState<string>("")
    const [goods, setGoods] = useState<ComboboxOption[]>([])
    const [fullGoods, setFullGoods] = useState<{ _id: string, GoodsName: string, Division: number }[]>([])
    const [good, setGood] = useState<string>("")
    const [availableRoutes, setAvailableRoutes] = useState<CustomerFormData[]>([])
    const [selectedRoute, setSelectedRoute] = useState<string>("")

    useEffect(() => {
        let user = localStorage.getItem("adminUser")
        let jsonUser: TransAppUser = JSON.parse(user!)
        setProposedBy(jsonUser.name)
    }, [])

    const handleDriverSelection = (driver: Driver) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));
        if (driver) {
            setDriver(driver.Name);
        }
        if (driver.MobileNo && driver.MobileNo.length > 0) {
            const lastUsedNumber = driver.MobileNo.find(num => num.LastUsed);
            const defaultNumber = driver.MobileNo.find(num => num.IsDefaultNumber);
            const firstNumber = driver.MobileNo[0];
            const mobileNumber = (lastUsedNumber || defaultNumber || firstNumber)?.MobileNo || '';

            setDriverMobile(mobileNumber);
        } else {
            setDriverMobile('');
        }
    }

    const searchDriver = async (idNumber: string) => {
        setLoading(true);
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
            setLoading(false);
        }
    }

    useEffect(() => {
        setManagerComment("#Loaded ");
        setDriver(selectedTrip.StartDriver)
        setDriverMobile(selectedTrip.StartDriverMobile)

        if (selectedTrip && selectedTrip.EndTo) {
            toast.success("Trip data loaded. Fetching routes...");
            fetchRoutes();
        }
    }, [selectedTrip])

    // useEffect(() => {
    //     setSearch(selectedRoute.split('To ')[1])
    // }, [selectedRoute])

    const fetchStackHolders = async () => {
        try {
            const response = await fetch(`${BASE_URL}/trans-app/customers?search=${search}`);
            const data = await response.json();
            const formattedData: ComboboxOption[] = data.map((item: { _id: string, Name: string }) => ({
                value: item.Name,
                label: item.Name
            }));
            setStackHolders(formattedData);
            setFullStackHolders(data);
        } catch (error) {
            console.error('Error fetching fuel providers:', error);
        }
    }

    useEffect(() => {
        fetchStackHolders();
    }, [search]);

    useEffect(() => {
        setLocation(fullStackHolders.find((holder) => holder.Name === stackHolder)?.Location)
    }, [stackHolder, fullStackHolders, stackHolders])

    const fetchGoods = async () => {
        try {
            const response = await fetch(`${BASE_URL}/trans-app/goods?params=${goodsSearch}`);
            const data = await response.json();
            const formattedData: ComboboxOption[] = data.map((item: { _id: string, GoodsName: string }) => ({
                value: item._id,
                label: item.GoodsName
            }));
            setGoods(formattedData);
            setFullGoods(data)
        } catch (error) {
            console.error('Error fetching fuel providers:', error);
        }
    }
    useEffect(() => {
        fetchGoods();
    }, [goodsSearch]);


    const resetForm = () => {
        setDriver('')
        setDriverMobile('')
        setOdometer(parseFloat(''))
        setStackHolder('')
        setGood('')
        setQty(parseFloat(''))
        setManagerComment('#Loaded ')
        setSelectedRoute('')
        setOrderedBy('')
        setProposedBy('')
    }

    const validateInputs = () => {
        if (!Driver || Driver.length && Driver.length < 8) {
            toast.error('Please enter the driver details correctly', { richColors: true })
            return false
        }
        if (!driverMobile || driverMobile.length && driverMobile.length !== 10) {
            toast.error('Please enter a valid Driver mobile number', { richColors: true })
            return false
        }
        if (!odometer || odometer && odometer < 0) {
            toast.error('Please enter correct Odometer, it is required in destination change in between', { richColors: true })
            return false
        }
        if (!stackHolder || stackHolder === "") {
            toast.error('Please chose a valid destination', { richColors: true })
            return false
        }
        if (!good || good === "") {
            toast.error('Please chose a valid Loaded Good', { richColors: true })
            return false
        }
        if (!qty || qty && qty < 0) {
            toast.error('Please enter valid Quantity', { richColors: true })
            return false
        }
        if (!ManagerComment || ManagerComment === "" || ManagerComment.length < 7) {
            setManagerComment('#Loaded ')
            toast.error('Please enter valid comment', { richColors: true })
            return false
        }
        if (!proposedBy || !orderedBy || proposedBy && proposedBy.length && proposedBy.length < 3 || orderedBy && orderedBy.length && orderedBy.length < 3) {
            toast.error('Please enter valid Proposed by and Ordered by details', { richColors: true })
            return false
        } else {
            return true
        }
    }

    const submit = async () => {
        try {
            setLoading(true);
            const data = {
                driverName: Driver,
                driverMobile,
                TrackUpdateDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                ManagerComment,
                targetTime,
                orderedBy,
                proposedBy,
                Route: selectedRoute,
            }
            const url = `${BASE_URL}/trans-app/trip-update/loaded`;
            const tripId = selectedTrip._id;

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tripId, data }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to submit trip update:", errorText);
                toast.error("Failed to submit trip update: ", { description: errorText, richColors: true });
            } else {
                toast.success("Trip update submitted successfully!", { richColors: true });
            }
        } catch (err) {
            console.log("Submitting error: ", err);
            toast.error("Local Error in Submitting data", {
                description: String(err),
                richColors: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchRoutes = async () => {
        try {
            const response = await fetch(`${BASE_URL}/trans-app/customers?search=${selectedTrip.EndTo.split(':')[0]}`);
            const data: any[] = await response.json();
            const routes: any[] = [];
            data.forEach(customer => {
                if (customer.ROuteDetention) {
                    customer.ROuteDetention.forEach((rd: any) => {
                        routes.push({
                            ...rd,
                            customerName: customer.CustomerName || customer.Name,
                            customerId: customer._id
                        });
                    });
                }
            });
            setAvailableRoutes(routes);
            if (routes.length > 0) {
                openRouteSelection(routes);
            } else {
                toast.error("No routes found for this destination.");
            }
        } catch (error) {
            console.error('Error fetching routes:', error);
            toast.error("Failed to fetch routes.");
        }
    }

    const openRouteSelection = (routes: any[]) => {
        if (routes.length > 0) {
            setSearchModalConfig({
                isOpen: true,
                title: "Select a Route",
                items: routes,
                onSelect: (route: any) => {
                    setSelectedRoute(route.Route);
                    setSearch(route.Route.split('To ')[1])
                    setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));
                },
                renderItem: (route) => (
                    <div className="flex flex-col text-left w-full h-[80px]">
                        <span className="font-bold">{route.Route}</span>
                        <span className="text-xs text-muted-foreground">{route.customerName}</span>
                        {route.Detention && route.Detention.length > 0 && (
                            <div className="mt-1 text-xs border-t pt-1">
                                {route.Detention.map((det: any, idx: number) => (
                                    <div key={idx}>
                                        {det.Product}: ₹{det.Charges} <br /> {det.DetMethod}, {det.DetDays} days
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ),
                keyExtractor: (route: any) => `${route.customerId}-${route.Route}`,
            });
        }
    };

    return (
        <div>
            {loading && <Loading />}
            <div className='flex flex-col gap-4 my-8'>
                <div>
                    <Label htmlFor="driver">Driver</Label>
                    <Input
                        id="driver"
                        value={Driver}
                        onChange={(e) => {
                            const value = e.target.value;
                            setDriver(value);
                            const nativeEvent = e.nativeEvent as InputEvent;
                            if (nativeEvent.inputType === "insertText" && e.currentTarget.value.length > 3) {
                                searchDriver(value);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Backspace") {
                                return;
                            }
                            if (e.key === 'Enter' && Driver.length > 3) {
                                e.preventDefault();
                                searchDriver(Driver);
                            }
                        }}
                        className={`${!Driver ? "bg-yellow-100" : ""}`}
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="driver-mobile">Mobile No</Label>
                    <Input
                        id="driver-mobile"
                        value={driverMobile}
                        onChange={(e) => {
                            const value = e.target.value;
                            setDriverMobile(value);
                        }}
                        className={`${!driverMobile ? "bg-yellow-100" : ""}`}
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="location">Consignor</Label>
                    <Combobox
                        className={`${!stackHolder ? "bg-yellow-100" : ""} w-full`}
                        options={stackHolders}
                        value={stackHolder}
                        onChange={setStackHolder}
                        searchTerm={search}
                        onSearchTermChange={setSearch}
                        placeholder="Select Destination"
                    />
                </div>

                <div>
                    <Label htmlFor='location'>Location</Label>
                    <Input type='string' id='location' readOnly onChange={(e) => setLocation(e.target.value)} value={location} className={`${!location ? "bg-yellow-100" : ""}`} />
                </div>

                <div>
                    <Label htmlFor="route">Route</Label>
                    <Input
                        id="route"
                        value={selectedRoute}
                        readOnly
                        onClick={() => {
                            if (availableRoutes.length > 0) {
                                openRouteSelection(availableRoutes);
                            } else {
                                fetchRoutes();
                            }
                        }}
                        placeholder="Click to select route"
                        className={`${!selectedRoute ? "bg-yellow-100" : ""}`}
                    />
                </div>
                
                <div>
                    <Label htmlFor="dateTime">Load Date Time</Label>
                    <Input
                        id="dateTime"
                        type="datetime-local"
                        placeholder="Current Time"
                        value={loadDate ? format(loadDate, "yyyy-MM-dd'T'HH:mm") : ""}
                        onChange={(e) => {
                            setLoadDate(e.target.value ? new Date(e.target.value) : undefined);
                        }}
                    />
                </div>

                <div>
                    <Label htmlFor="dateTime">Target Reaching Time</Label>
                    <Input
                        id="dateTime"
                        type="datetime-local"
                        placeholder="Current Time"
                        value={targetTime ? format(targetTime, "yyyy-MM-dd'T'HH:mm") : ""}
                        onChange={(e) => {
                            setTargetTime(e.target.value ? new Date(e.target.value) : undefined);
                        }}
                    />
                </div>

                <div>
                    <Label htmlFor="odometer">Odometer at loading</Label>
                    <Input
                        className={`${!odometer ? "bg-yellow-100" : ""}`}
                        id="odometer"
                        type="string"
                        value={odometer || ""}
                        onChange={(e) => {
                            const value = e.target.value;
                            setOdometer(value ? parseFloat(value) : undefined);
                        }}
                    />
                </div>

                <Label htmlFor="goods">Loaded Good</Label>
                <Combobox
                    className={`${!good ? "bg-yellow-100" : ""} w-full`}
                    options={goods}
                    value={good}
                    onChange={setGood}
                    searchTerm={goodsSearch}
                    onSearchTermChange={setGoodsSearch}
                    placeholder="Select Loaded Good"
                />

                <div>
                    <Label htmlFor="goods-qty">Quantity</Label>
                    <Input
                        id="goods-qty"
                        type="string"
                        value={qty || ""}
                        onChange={(e) => {
                            const value = e.target.value;
                            setQty(value ? parseFloat(value) : undefined);
                        }}
                    />
                </div>

                <div>
                    <Label htmlFor="comment">Comment</Label>
                    <Input id="comment" value={ManagerComment} onChange={(e) => setManagerComment(e.target.value)} className={`${!ManagerComment ? "bg-yellow-100" : ""}`} type="string" placeholder="" />
                </div>

                <div>
                    <Label>Ordered By</Label>
                    <Input
                        id="ordered-by"
                        type="text"
                        value={orderedBy}
                        onChange={(e) => {
                            const value = e.target.value;
                            setOrderedBy(value);
                        }}
                        className={`${!orderedBy ? "bg-yellow-100" : ""}`}
                    />
                </div>

                <div>
                    <Label id="proposed-by">Proposed By</Label>
                    <Input
                        id="proposed-by"
                        type="text"
                        value={proposedBy}
                        onChange={(e) => {
                            const value = e.target.value;
                            setProposedBy(value);
                        }}
                        className={`${!proposedBy ? "bg-yellow-100" : ""}`}
                    />
                </div>

                <div className="w-full flex gap-2 flex-row justify-between mt-2">
                    <Button className="flex-1" variant="secondary" type="reset" onClick={() => resetForm()}>Reset</Button>
                    {/* {if (validateInputs()) } */}
                    <Button className="flex-1" type="button" onClick={() => { setIsConfirmationDialogueOpen(true) }} >Submit</Button>
                </div>
            </div>

            <SearchModal
                isOpen={searchModalConfig.isOpen}
                onClose={() => setSearchModalConfig((prev) => ({ ...prev, isOpen: false }))}
                title={searchModalConfig.title}
                items={searchModalConfig.items}
                onSelect={searchModalConfig.onSelect}
                renderItem={searchModalConfig.renderItem}
                keyExtractor={searchModalConfig.keyExtractor}
            />

            <AlertDialog open={isConfirmationDialogueOpen} onOpenChange={setIsConfirmationDialogueOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Please confirm</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                        Are you sure to mark the trip as Loaded with the above filled details?
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => submit()}>Confirm and Proceed</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default MarkLoaded

