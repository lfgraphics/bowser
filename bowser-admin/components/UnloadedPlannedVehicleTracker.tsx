"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { format } from "date-fns"
import { use, useEffect, useMemo, useState } from "react"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import Combobox, { ComboboxOption } from "./Combobox"
import { Driver, TankersTrip } from "@/types"
import { getLocalDateTimeString } from "@/utils"
import { BASE_URL } from "@/lib/api"
import { toast, Toaster } from "sonner"
import { formatDate } from "@/lib/utils"
import Loading from "@/app/loading"
import { searchItems } from "@/utils/searchUtils"
import { SearchModal } from "./SearchModal"

export default function UnloadedPlannedVehicleTracker({ tripsData }: { tripsData: TankersTrip[] }) {
    const [loading, setLoading] = useState(false)
    const [targetTime, setTargetTime] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [proposedDate, setProposedDate] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [odometer, setOdometer] = useState<number | undefined>(undefined)
    const [orderedBy, setOrderedBy] = useState<string>("")
    const [actionType, setActionType] = useState<"update" | "report" | "unload" | "destinationChange" | undefined>(undefined)
    const [TrackUpdateDate, setTrackUpdateDate] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [OdometerOnTrackUpdate, setOdometerOnTrackUpdate] = useState<number | undefined>(undefined)
    const [LocationRemark, setLocationRemark] = useState<string>("")
    const [ManagerComment, setManagerComment] = useState<string>("")
    const [data, setData] = useState<TankersTrip[]>(tripsData || [])
    const [driverMobile, setDriverMobile] = useState<string>("")
    const [vehicleSearch, setVehicleSearch] = useState<string>("")
    const [Driver, setDriver] = useState<string>("");
    const [search, setSearch] = useState<string>("")
    const [stackHolders, setStackHolders] = useState<ComboboxOption[]>([])
    const [stackHolder, setStackHolder] = useState<string>("")
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

    const [tripId, setTripId] = useState<string>("")

    useEffect(() => {
        if (actionType === "report") {
            setTrackUpdateDate(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined);
            setLocationRemark(data.find(trip => trip?._id === tripId)?.EndTo.toUpperCase() || "");
            setManagerComment("Arrival #REPORTED by the vehicle at [" + data.find(trip => trip?._id === tripId)?.TallyLoadDetail?.Consignee.toUpperCase() + "]");
        }
        if (actionType === "unload") {
            setTrackUpdateDate(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined);
            setLocationRemark(data.find(trip => trip?._id === tripId)?.EndTo.toUpperCase() || "");
            setManagerComment("The vehicle has been #UNLOADED at [" + data.find(trip => trip?._id === tripId)?.TallyLoadDetail?.Consignee.toUpperCase() + "]");
        }
        if (actionType === "update") {
            setTrackUpdateDate(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined);
            setLocationRemark("");
            setManagerComment("");
        }
    }, [actionType]);

    const resetForm = () => {
        setTripId("");
        setActionType(undefined);
    }

    const submit = async () => {
        const url = `${BASE_URL}/trans-app/trip-update/${actionType}`;
        const data = {
            TrackUpdateDate,
            OdometerOnTrackUpdate,
            LocationRemark,
            ManagerComment,
        }
        console.log("Submitting trip update:", { url, tripId, data });
        // try {
        //     const response = await fetch(url, {
        //         method: "POST",
        //         headers: {
        //             "Content-Type": "application/json",
        //         },
        //         body: JSON.stringify({
        //             tripId,
        //             data
        //         }),
        //     });
        //     if (!response.ok) {
        //         const errorText = await response.text();
        //         console.error("Failed to submit trip update:", errorText);
        //         toast.error("Failed to submit trip update: " + errorText);
        //         return;
        //     }
        //     toast.success("Trip update submitted successfully!");
        // } catch (error) {
        //     console.error("Error submitting trip update:", error);
        //     toast.error("An error occurred while submitting the trip update.");
        // }
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
    const fetchStackHolders = async () => {
        try {
            const response = await fetch(`${BASE_URL}/trans-app/stack-holders?params=${search}`);
            const data = await response.json();
            const formattedData: ComboboxOption[] = data.map((item: { _id: string, InstitutionName: string }) => ({
                value: item._id,
                label: item.InstitutionName
            }));
            setStackHolders(formattedData);
        } catch (error) {
            console.error('Error fetching fuel providers:', error);
        }
    }
    useEffect(() => {
        fetchStackHolders();
    }, [search]);
    useEffect(() => {
        setDriver(data.find(trip => trip?._id === tripId)?.StartDriver || "");
        setOdometer(data.find(trip => trip?._id === tripId)?.EmptyTripDetail?.EndOdometer || 0);
        setDriverMobile(data.find(trip => trip?._id === tripId)?.StartDriverMobile || "")
    }, [data, tripId]);

    return (
        <>
            {loading && <Loading />}
            <Toaster />
            <div className="p-4 min-h-[80svh] flex flex-col justify-center">
                <div className="flex flex-col gap-4 md:flex-row items-center justify-center md:flex-shrink-0 w-full md:justify-around">
                    {tripId &&
                        <>
                            <div className="flex flex-col gap-2 md:gap-4 w-full md:w-auto justify-start">
                                <h4 className="text-lg font-semibold">Trip Details</h4>
                                <div className="flex">
                                    <strong>Started From: </strong>{data.find(trip => trip?._id === tripId)?.StartFrom || "N/A"}
                                </div>
                                <div className="flex">
                                    <strong>Starting Date: </strong>{formatDate(String(data.find(trip => trip?._id === tripId)?.StartDate))}
                                </div>
                                <div className="flex">
                                    <strong>Target Date: </strong>{formatDate(String(data.find(trip => trip?._id === tripId)?.targetTime))}
                                </div>
                                <div className="flex">
                                    <strong>Proposed Destination: </strong> {data.find(trip => trip?._id === tripId)?.EndTo || "N/A"}
                                </div>
                                <div className="flex">
                                    <strong>Starat Driver: </strong> {data.find(trip => trip?._id === tripId)?.StartDriver || "N/A"}
                                </div>
                            </div>
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
                    />
                    {
                        tripId && (
                            <div className="buttons flex flex-col gap-2 md:flex-row items-center w-full">
                                <Button className="w-full md:w-auto" onClick={() => setActionType("destinationChange")}>Destination Change</Button>
                                <Button className="w-full md:w-auto" onClick={() => setActionType("update")}>Update</Button>
                                <Button className="w-full md:w-auto" onClick={() => setActionType("report")}>Report</Button>
                                <Button className="w-full md:w-auto" onClick={() => setActionType("unload")}>Unload</Button>
                            </div>
                        )
                    }
                </div>
                <div className={actionType == undefined ? "hidden" : ""}>
                    {actionType !== "destinationChange" &&
                        <>
                            <Label htmlFor="dateTime">Current Date</Label>
                            <Input
                                id="dateTime"
                                type="datetime-local"
                                placeholder="Current Time"
                                value={TrackUpdateDate ? format(TrackUpdateDate, "yyyy-MM-dd'T'HH:mm") : ""}
                                onChange={(e) => {
                                    setTrackUpdateDate(e.target.value ? new Date(e.target.value) : undefined);
                                }}
                            />

                            <Label htmlFor="odometer">Odometer</Label>
                            <Input
                                id="odometer"
                                value={OdometerOnTrackUpdate === undefined ? "" : OdometerOnTrackUpdate}
                                onChange={(e) => setOdometerOnTrackUpdate(e.target.value === "" ? undefined : Number(e.target.value))}
                                className=""
                                type="number"
                                placeholder=""
                            />

                            <Label htmlFor="locationRemark">Location Remark</Label>
                            <Input id="locationRemark" value={LocationRemark} onChange={(e) => setLocationRemark(e.target.value)} className="" type="string" placeholder="" />

                            <Label htmlFor="comment">Instruction/ Comment</Label>
                            <Input id="comment" value={ManagerComment} onChange={(e) => setManagerComment(e.target.value)} className="" type="string" placeholder="" />
                        </>
                    }
                    {actionType == "destinationChange" &&
                        <>
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
                                />
                                <Label htmlFor="location">Destination</Label>
                                <Combobox
                                    className="w-full"
                                    options={stackHolders}
                                    value={stackHolder}
                                    onChange={setStackHolder}
                                    searchTerm={search}
                                    onSearchTermChange={setSearch}
                                    placeholder="Select Destination"
                                />
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
                                <Label htmlFor="odometer">Odometer</Label>
                                <Input
                                    id="odometer"
                                    type="number"
                                    value={odometer || ""}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setOdometer(value ? parseFloat(value) : undefined);
                                    }}
                                />
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
                                <div className="flex gap-2 flex-row justify-between mt-2">
                                    <Button className="w-full md:w-auto" variant="secondary" type="reset" onClick={() => resetForm()}>Reset</Button>
                                    <Button className="w-full md:w-auto" type="button" onClick={() => submit()}>Submit</Button>
                                </div>
                            </div>
                        </>
                    }

                    <div className="flex gap-2 flex-row justify-between mt-2">
                        <Button className="w-full md:w-auto" variant="secondary" type="reset" onClick={() => resetForm()}>Reset</Button>
                        <Button className="w-full md:w-auto" type="button">Submit</Button>
                    </div>
                </div>
            </div>


            <div className="grid-cols-1 lg:grid-cols-2 gap-4 p-4 hidden">
                {/* Left Panel */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Load Vehicle Tracker</h2>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label>Lorry No.</Label>
                            <Combobox
                                className="w-full mt-3"
                                options={vehicles}
                                value={tripId}
                                onChange={setTripId}
                                searchTerm={vehicleSearch}
                                onSearchTermChange={setVehicleSearch}
                                placeholder="Select Vehicle"
                            />
                        </div>
                        <div>
                            <Label>Odometer</Label>
                            <Input className="mt-3" type="number" placeholder="" />
                        </div>
                        <div>
                            <Label>Unloading #To</Label>
                            <Input placeholder="" value={data.find(trips => trips?._id == tripId)?.EndTo} />
                        </div>
                        <div>
                            <Label>Rest KM</Label>
                            <Input />
                        </div>
                        <div className="col-span-2">
                            <Label>Factory Name</Label>
                            <Input placeholder="" value={data.find(trips => trips?._id == tripId)?.TallyLoadDetail?.Consignor} className="col-span-2" />
                        </div>
                        <div className="col-span-1">
                            <Label>Current Date</Label>
                            <Input
                                id="pumpEndReading"
                                type="datetime-local"
                                placeholder="Current Time"
                                value={getLocalDateTimeString()}
                                onChange={(e) => {
                                    setTrackUpdateDate(e.target.value ? new Date(e.target.value) : undefined);
                                }}
                            />
                        </div>
                        <div>
                            <Label>Odometer</Label>
                            <Input />
                        </div>
                    </div>

                    <div>
                        <Label>Location Remark</Label>
                        <Input />
                    </div>
                    <div>
                        <Label>Instruction / Comment</Label>
                        <Textarea rows={2} />
                    </div>

                    <div className="flex gap-2">
                        <Button variant="default">Update</Button>
                        <Button variant="secondary">Reported</Button>
                        <Button variant="destructive">Unloaded</Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label>Last Update</Label>
                            <Input />
                        </div>
                        <div>
                            <Label>Odometer</Label>
                            <Input />
                        </div>
                    </div>
                    <div>
                        <Label>Last Loc. Remark</Label>
                        <Input />
                    </div>
                    <div>
                        <Label>Last Instruction / Comment</Label>
                        <Textarea rows={2} />
                    </div>
                </div>

                {/* Right Panel */}
                <div className="space-y-4">
                    <div>
                        <h2 className="text-xl font-bold">Track History</h2>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="mt-2">
                                <Label className="mt-2" >Loaded #From</Label>
                                <Input placeholder="" value={data.find(trips => trips?._id == tripId)?.StartFrom} />
                            </div>
                            <div className="mt-2">
                                <Label className="mt-2" >Loading Date</Label>
                                <Input placeholder="" value={data.find(trips => trips?._id == tripId)?.TallyLoadDetail?.LoadingDate} />
                            </div>
                            <div className="col-span-2">
                                <Label>Total Distance</Label>
                                <Input placeholder="(calculated field)" /> {/* KMbyRoute */}
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            {tripId}
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Odometer</TableHead>
                                <TableHead>Comment</TableHead>
                                <TableHead>Driver</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Data rows go here */}
                        </TableBody>
                    </Table>
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
