import React, { useEffect, useState } from 'react'

import { format } from 'date-fns'
import { toast } from 'sonner'

import Loading from '@/app/loading'
import { BASE_URL } from '@/lib/api'
import { Driver, TankersTrip } from '@/types'
import { getLocalDateTimeString } from '@/utils'
import { searchItems } from '@/utils/searchUtils'

import Combobox, { ComboboxOption } from '../Combobox'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { SearchModal } from '../SearchModal'

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
    const [fullStackHolders, setFullStackHolders] = useState<{ _id: string, Location: string, InstitutionName: string }[]>([])
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
    }, [selectedTrip])

    const fetchStackHolders = async () => {
        try {
            const response = await fetch(`${BASE_URL}/trans-app/stack-holders?params=${search}`);
            const data = await response.json();
            const formattedData: ComboboxOption[] = data.map((item: { _id: string, InstitutionName: string }) => ({
                value: item._id,
                label: item.InstitutionName
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
        setLocation(fullStackHolders.find((holder) => holder._id === stackHolder)?.Location)
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
                EndDestination: fullStackHolders.find((holder) => holder._id == stackHolder)?.InstitutionName,
                EndLocation: location,
                EndDate: loadDate,
                GoodsLoaded: fullGoods.find((each) => each._id == good)?.GoodsName,
                QtyLoaded: qty,
                OdometerOnTrackUpdate: odometer,
                LocationOnTrackUpdate: fullStackHolders.find((holder) => holder._id == stackHolder)?.InstitutionName,
                TrackUpdateDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                ManagerComment,
                targetTime,
                orderedBy,
                proposedBy,
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
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="location">Consignor</Label>
                    <Combobox
                        className="w-full"
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
                    <Input type='string' id='location' readOnly onChange={(e) => setLocation(e.target.value)} value={location}></Input>
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
                    className="w-full"
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
                    <Input id="comment" value={ManagerComment} onChange={(e) => setManagerComment(e.target.value)} className="" type="string" placeholder="" />
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
                    />
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
                    />
                </div>

                <div className="flex gap-2 flex-row justify-between mt-2">
                    <Button className="w-full md:w-auto" variant="secondary" type="reset" onClick={() => resetForm()}>Reset</Button>
                    <Button className="w-full md:w-auto" type="button" onClick={() => { if (validateInputs()) setIsConfirmationDialogueOpen(true) }} >Submit</Button>
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

