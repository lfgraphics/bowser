"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import Combobox, { ComboboxOption } from "./Combobox"
import { TankersTrip, Driver, TransAppUser } from "@/types"
import { getLocalDateTimeString } from "@/utils"
import { BASE_URL } from "@/lib/api"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { SearchModal } from "./SearchModal"
import { searchItems } from "@/utils/searchUtils"
import Loading from "@/app/loading"
import { DatePicker, DateTimePicker } from "./ui/datetime-picker"

export default function UnloadedUnplannedVehicleTracker({ tripsData, user, query }: { tripsData: TankersTrip[], user: TransAppUser | undefined, query: { tripId: string, destination: string, destinationName: string, notificationId: string, orderedBy: string } }) {
    const [loading, setLoading] = useState<boolean>(false)
    const [targetTime, setTargetTime] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [proposedDate, setProposedDate] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [odometer, setOdometer] = useState<number>(0)
    const [orderedBy, setOrderedBy] = useState<string>(query.orderedBy || "")
    const [proposedBy, setProposedBy] = useState<string>("")
    const [data, setData] = useState<TankersTrip[]>(tripsData || [])
    const [driverMobile, setDriverMobile] = useState<string>("")
    const [vehicleSearch, setVehicleSearch] = useState<string>("")
    const [tripId, setTripId] = useState<string>(query.tripId)
    const [Driver, setDriver] = useState<string>("");
    const [search, setSearch] = useState<string>(query.destinationName || "")
    const [stackHolders, setStackHolders] = useState<ComboboxOption[]>([])
    const [stackHolder, setStackHolder] = useState<string>("")
    const [currentTrip, setCurrentTrip] = useState<TankersTrip | null>(null)
    const vehicles: ComboboxOption[] = useMemo(() => {
        return data.map(trip => ({
            label: trip?.VehicleNo,
            value: trip?._id
        }));
    }, [data]);
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
        let user = localStorage.getItem("adminUser")
        let jsonUser: TransAppUser = JSON.parse(user!)
        setProposedBy(jsonUser.name)
        searchDriver(data.find((trip) => trip._id === tripId)?.StartDriver!)
    }, []);

    useEffect(() => {
        if (query.destination && query.destinationName) {
            setStackHolder(query.destination)
            setSearch(query.destinationName)
            setOrderedBy(query.orderedBy || "")
            fetchStackHolders()
        }
    }, [query])

    useEffect(() => {
        const crTtip = data.find(trip => trip?._id === tripId);
        const odo = crTtip?.LoadTripDetail?.EndOdometer
        console.log("Current Trip Changed:", crTtip);
        setCurrentTrip(crTtip || null);
        searchDriver(crTtip?.StartDriver!)
        setOdometer(odo!);
        console.log('ododmeter: ', odo);
        setDriver(crTtip?.StartDriver || "");
        setDriverMobile(crTtip?.StartDriverMobile || "");
    }, [data, tripId]);

    const resetForm = () => {
        setTripId("");
        setDriver("");
        setDriverMobile("");
        setStackHolder("");
        setTargetTime(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined);
    }

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
                    title: "Select Driver",
                    items: drivers,
                    onSelect: handleDriverSelection,
                    renderItem: (driver) => `${driver.Name}, ${driver.MobileNo.find((num: { LastUsed: boolean }) => num.LastUsed)?.MobileNo || "No Last Used Mobile No."}`,
                    keyExtractor: (driver) => driver.ITPLId || driver.Name,
                });
            }
        } catch (error: any) {
            const message = error?.message || 'Failed to search for driver';
            toast.error(message, { richColors: true });
        } finally {
            setLoading(false);
        }
    }

    const validateInputs = () => {
        if (!tripId) {
            toast.error("Please select a trip", { richColors: true });
            return false;
        }
        if (!Driver) {
            toast.error("Please select a driver", { richColors: true });
            return false;
        }
        if (!stackHolder) {
            toast.error("Please select a destination", { richColors: true });
            return false;
        }
        if (!targetTime) {
            toast.error("Please select a target time", { richColors: true });
            return false;
        }
        return true;
    }

    const submit = async () => {
        if (!validateInputs()) {
            return;
        }
        const url = `${BASE_URL}/trans-app/trip-update/create-empty-trip`;
        const postData = {
            VehicleNo: data.find(trip => trip?._id === tripId)?.VehicleNo,
            driverName: Driver,
            driverMobile,
            stackHolder: stackHolders.find(holder => holder.value === stackHolder)?.label || stackHolder,
            targetTime: targetTime?.toISOString(),
            odometer,
            orderedBy,
            proposedBy,
            previousTripId: tripId,
            StartFrom: data.find(trip => trip?._id === tripId)?.EndTo,
            division: user?.Division || "",
            proposedDate: (() => {
                const date = proposedDate ? new Date(proposedDate) : new Date();
                // Create date at start of day in UTC to avoid timezone shifts
                return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 1, 800));
            })(),
            notificationId: query.notificationId || ""
        }
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    postData
                }),
            });
            if (!response.ok) {
                let errorMsg = 'Failed to submit trip update';
                try {
                    const errJson = await response.json();
                    errorMsg = errJson?.message || errorMsg;
                } catch {
                    const errorText = await response.text();
                    errorMsg = errorText || errorMsg;
                }
                toast.error(errorMsg, { richColors: true });
                return;
            }
            toast.success("Trip update submitted successfully!", { richColors: true });
        } catch (error: any) {
            const message = error?.message || 'An error occurred while submitting the trip update.';
            toast.error(message, { richColors: true });
        }
    }

    const fetchStackHolders = async () => {
        try {
            const response = await fetch(`${BASE_URL}/trans-app/stack-holders?params=${search}`);
            const data = await response.json();
            const formattedData: ComboboxOption[] = data.map((item: { _id: string, InstitutionName: string, Location: string }) => ({
                value: item._id,
                label: `${item.InstitutionName}: ${item.Location}`
            }));
            setStackHolders(formattedData);
        } catch (error: any) {
            const message = error?.message || 'Failed to fetch destinations';
            toast.error(message, { richColors: true });
        }
    }

    useEffect(() => {
        fetchStackHolders();
    }, [search]);

    useEffect(() => {
        setDriver(data.find(trip => trip?._id === tripId)?.StartDriver || "");
        searchDriver(data.find((trip) => trip._id === tripId)?.StartDriver!);
        setOdometer(data.find(trip => trip?._id === tripId)?.TallyLoadDetail.EndOdometer || 0);
        setDriverMobile(data.find(trip => trip?._id === tripId)?.StartDriverMobile || "")
    }, [data, tripId]);

    return (
        <>
            {loading && <Loading />}
            <div className="flex justify-center w-full">
                <div className="p-4 min-h-[80svh] flex flex-col justify-center gap-4 sm:max-w-xl py-2">
                    {tripId &&
                        <>
                            id: {tripId}
                            {(() => {
                                const t = data.find(trip => trip?._id === tripId);
                                return (
                                    <div className="gap-y-2">
                                        <strong className="text-lg">Last trip details</strong><br />
                                        <div className="hidden">
                                            <span><strong>Start Date: </strong></span>
                                            <span>{formatDate(String(t?.StartDate))}</span>

                                            <span><strong>Started From: </strong></span>
                                            <span>{t?.StartFrom || "N/A"}</span>

                                            <span><strong>Start Driver: </strong></span>
                                            <span>{t?.StartDriver || "N/A"}</span>

                                            <span><strong>Loading Date: </strong></span>
                                            <span>{formatDate(String(t?.StartDate))}</span>

                                            <span><strong>Unloading Factory: </strong></span>
                                            <span>{t?.TallyLoadDetail?.Consignee || "N/A"}</span>

                                            <span><strong>Reporting Date: </strong></span>
                                            <span>{formatDate(t?.ReportingDate || t?.TallyLoadDetail?.ReportedDate || "")}</span>
                                        </div>
                                        <div className="grid grid-cols-[auto_1fr] gap-x-2 text-lg">
                                            <span><strong>Unloading Date: </strong></span>
                                            <span>
                                                {formatDate(t?.TallyLoadDetail?.UnloadingDate || t?.LoadTripDetail?.UnloadDate || "") === "no date provided"
                                                    ? "No unloading date"
                                                    : formatDate(t?.TallyLoadDetail?.UnloadingDate || t?.LoadTripDetail?.UnloadDate || "")
                                                }
                                            </span>

                                            <span><strong>Depo: </strong></span>
                                            <span>{t?.EndTo || "N/A"}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    }
                    <Combobox
                        className="w-full md:w-auto"
                        options={vehicles}
                        value={tripId}
                        onChange={setTripId}
                        searchTerm={vehicleSearch}
                        onSearchTermChange={setVehicleSearch}
                        placeholder="Select Vehicle"
                        showAddButton={false}
                    />
                    <div className={tripId == "" ? "hidden" : ""}>
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
                        <Label htmlFor="driver-mobile">Mobile No</Label>
                        <Input
                            id="driver-mobile"
                            value={driverMobile}
                            onChange={(e) => {
                                const value = e.target.value;
                                setDriverMobile(value);
                            }}
                            required
                            className={`${!driverMobile ? "bg-yellow-100" : ""}`}
                        />
                        <Label htmlFor="location">Destination</Label>
                        <Combobox
                            className={`${!stackHolder ? "bg-yellow-100" : ""} w-full`}
                            options={stackHolders}
                            value={stackHolder}
                            onChange={setStackHolder}
                            searchTerm={search}
                            onSearchTermChange={setSearch}
                            placeholder="Select Destination"
                        />
                        <Label htmlFor="dateTime">Proposed Departure Time</Label>
                        <DatePicker
                            value={proposedDate}
                            onChange={setProposedDate}
                        />
                        <Label htmlFor="dateTime">Target Reaching Time</Label>
                        <DateTimePicker
                            value={targetTime}
                            onChange={(d) => setTargetTime(d ?? undefined)}
                        />
                        <Label htmlFor="odometer">Odometer</Label>
                        <Input
                            id="odometer"
                            type="string"
                            value={odometer}
                            onChange={(e) => {
                                const value = e.target.value;
                                setOdometer(value ? parseFloat(value) : 0);
                            }}
                        // className={`${!odometer || odometer < 0 ? "bg-yellow-100 text-black" : ""} text-foreground`}
                        />
                        {
                            <div className={query.orderedBy ? "hidden" : ""}>
                                <Label htmlFor="ordered-by">Ordered By</Label>
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
                        }
                        {
                            <div className="hidden">
                                <Label htmlFor="proposed-by">Proposed By</Label>
                                <Input
                                    id="proposed-by"
                                    type="text"
                                    value={proposedBy}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setProposedBy(value);
                                    }}
                                    readOnly
                                />
                            </div>
                        }
                        <div className="w-full flex gap-2 flex-row justify-between mt-2">
                            <Button className="flex-1" variant="secondary" type="reset" onClick={() => resetForm()}>Reset</Button>
                            <Button className="flex-1" type="button" onClick={() => submit()}>Submit</Button>
                        </div>
                    </div>
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
        </>
    )
}
