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
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { SearchModal } from '../SearchModal'

interface DestinationChangeProps {
    selectedTrip: TankersTrip,
    user: TransAppUser
}

const DestinationChange = ({ selectedTrip, user }: DestinationChangeProps) => {
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
    const [proposedDate, setProposedDate] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [odometer, setOdometer] = useState<number | undefined>(undefined)
    const [orderedBy, setOrderedBy] = useState<string>("")
    const [proposedBy, setProposedBy] = useState<string>("")
    const [userDivision, setUserDivision] = useState<string>("")
    const [modificationCheck, setModificationCheck] = useState<boolean>(false)
    const [ManagerComment, setManagerComment] = useState<string>("")
    const [location, setLocation] = useState<string | undefined>("")
    const [currentLocation, setCurrentLocation] = useState<string | undefined>("")
    const [isConfirmationDialogueOpen, setIsConfirmationDialogueOpen] = useState<boolean>(false)

    useEffect(() => {
        let user = localStorage.getItem("adminUser")
        let jsonUser: TransAppUser = JSON.parse(user!)
        setProposedBy(jsonUser.name)
        setUserDivision(jsonUser.Division)
        console.log(jsonUser.Division)
    }, [user])

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
        setManagerComment(`#DestinationModified ${modificationCheck ? "after leaving for" : ""} [ ${selectedTrip.EndTo} ] from ${currentLocation}, diverted to ${location}`);
        // setManagerComment("#DestinationModified [" + selectedTrip.EmptyTripDetail.ProposedDestination + `] ${currentLocation}`);
        setDriver(selectedTrip.StartDriver)
        setDriverMobile(selectedTrip.StartDriverMobile)
    }, [selectedTrip, currentLocation, modificationCheck, location])

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
            console.log(data)
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

    const resetForm = () => {
        setDriver('')
        setDriverMobile('')
        setOdometer(parseFloat(''))
        setOrderedBy('')
        setModificationCheck(false)
        setManagerComment('')
        setStackHolder('')
        setLocation('')
    }

    const validateInputs = () => {
        if (modificationCheck) {
            if (!currentLocation || currentLocation?.length && currentLocation.length < 3) {
                toast.error('Please enter the current location too', { richColors: true })
                return false
            }
            if (!odometer || odometer && odometer < 0) {
                toast.error('Please enter correct Odometer, it is required in destination change in between', { richColors: true })
                return false
            }
        }
        if (!Driver || Driver.length && Driver.length < 8) {
            toast.error('Please enter the driver details correctly', { richColors: true })
            return false
        }
        if (!driverMobile || driverMobile.length && driverMobile.length < 10) {
            toast.error('Please enter a valid Driver mobile number', { richColors: true })
            return false
        }
        if (!stackHolder) {
            toast.error('Please chose a valid destination', { richColors: true })
            return false
        }
        if (!proposedBy || !orderedBy || !proposedBy && proposedBy.length && proposedBy.length < 3 || orderedBy && orderedBy.length && orderedBy.length < 3) {
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
                VehicleNo: selectedTrip.VehicleNo,
                driverName: Driver,
                driverMobile,
                stackHolder: stackHolders.find(holder => holder.value === stackHolder)?.label || stackHolder,
                targetTime,
                odometer,
                orderedBy,
                proposedBy,
                previousTripId: selectedTrip._id,
                StartFrom: modificationCheck ? currentLocation : selectedTrip.StartFrom,
                division: userDivision,
                proposedDate,
                ManagerComment,
                modificationCheck
            }
            const url = `${BASE_URL}/trans-app/trip-update/destination-change`;
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
                <div className='flex flex-row gap-2 place-items-center'>
                    <Checkbox
                        id="modificationCheck"
                        checked={!!modificationCheck}
                        onCheckedChange={(checked) => setModificationCheck(!!checked)}
                        className="ml-2"
                    />
                    <Label className='text-red-500' htmlFor='modificationCheck'>{selectedTrip.EndTo} के लिए निकलने के बाद लोकेशन चेंज?</Label>
                </div>

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

                {modificationCheck &&
                    <div>
                        <Label htmlFor='currentLocation'>Current Location</Label>
                        <Input type='string' id='currentLocation' value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} className={`${!currentLocation ? "bg-yellow-100" : ""}`} />
                    </div>
                }

                <div>
                    <Label htmlFor="location">New Destination</Label>
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
                    <Input type='string' id='location' readOnly onChange={(e) => setLocation(e.target.value)} value={location}></Input>
                </div>

                <div>
                    <Label htmlFor="dateTime">Proposed Departure Time</Label>
                    <Input
                        id="dateTime"
                        type="datetime-local"
                        placeholder="Current Time"
                        value={proposedDate ? format(proposedDate, "yyyy-MM-dd'T'HH:mm") : ""}
                        onChange={(e) => {
                            setProposedDate(e.target.value ? new Date(e.target.value) : undefined);
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

                {modificationCheck &&
                    <div>
                        <Label htmlFor="odometer">Odometer</Label>
                        <Input
                            id="odometer"
                            type="string"
                            value={odometer || ""}
                            onChange={(e) => {
                                const value = e.target.value;
                                setOdometer(value ? parseFloat(value) : undefined);
                            }}
                            className={`${!odometer ? "bg-yellow-100" : ""}`}
                        />
                    </div>
                }

                <div>
                    <Label htmlFor="comment">Comment</Label>
                    <Input id="comment" value={ManagerComment} onChange={(e) => setManagerComment(e.target.value)} className={`${!ManagerComment ? "bg-yellow-100" : ""}`} type="string" placeholder="" />
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

                <div className="flex gap-2 flex-row justify-between mt-2">
                    <Button className="w-full" variant="secondary" type="reset" onClick={() => resetForm()}>Reset</Button>
                    {/* { if (validateInputs()) } */}
                    <Button className="w-full" type="button" onClick={() => { setIsConfirmationDialogueOpen(true) }} >Submit</Button>
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
                        {modificationCheck ? `You are changing the plan at ${currentLocation} after the tanker was departed for the last planned destination: ${selectedTrip.EndTo}` : `You are changing the plan even before the tanker departing from ${selectedTrip.EndTo}`}
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

export default DestinationChange

