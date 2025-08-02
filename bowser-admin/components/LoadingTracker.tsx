"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import Combobox, { ComboboxOption } from "./Combobox"
import { Driver, TankersTrip } from "@/types"
import { getLocalDateTimeString } from "@/utils"
import { BASE_URL } from "@/lib/api"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import Loading from "@/app/loading"
import { searchItems } from "@/utils/searchUtils"
import { SearchModal } from "./SearchModal"
import DestinationChange from "./transappComponents/DestinationChange"
import MarkLoaded from "./transappComponents/MarkLoaded"

export default function UnloadedPlannedVehicleTracker({ tripsData }: { tripsData: TankersTrip[] }) {
    const [loading, setLoading] = useState(false)
    const [actionType, setActionType] = useState<"update" | "report" | "loaded" | "destinationChange" | undefined>(undefined)
    const [TrackUpdateDate, setTrackUpdateDate] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [OdometerOnTrackUpdate, setOdometerOnTrackUpdate] = useState<number | undefined>(undefined)
    const [LocationRemark, setLocationRemark] = useState<string>("")
    const [ManagerComment, setManagerComment] = useState<string>("")
    const [data, setData] = useState<TankersTrip[]>(tripsData || [])
    const [vehicleSearch, setVehicleSearch] = useState<string>("")
    const [Driver, setDriver] = useState<string>("");
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
            setManagerComment("Arrival #REPORTED by the vehicle at [" + data.find(trip => trip?._id === tripId)?.EndTo + "]");
        }
        if (actionType === "update") {
            setTrackUpdateDate(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined);
            setLocationRemark("");
            setManagerComment("");
        }
    }, [actionType, tripId]);

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
            Driver
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tripId,
                    data
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to submit trip update:", errorText);
                toast.error("Failed to submit trip update: ", { description: errorText, richColors: true });
                return;
            }
            toast.success("Trip update submitted successfully!", { richColors: true });
        } catch (error) {
            console.error("Error submitting trip update:", error);
            toast.error("An error occurred while submitting the trip update.", { richColors: true });
        }
    }

    useEffect(() => {
        setDriver(data.find(trip => trip?._id === tripId)?.StartDriver || "");
        setOdometerOnTrackUpdate(data.find(trip => trip?._id === tripId)?.EmptyTripDetail?.EndOdometer || 0);
    }, [data, tripId]);

    const handleDriverSelection = (driver: Driver) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));
        if (driver) {
            setDriver(driver.Name);
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

    return (
        <>
            {loading && <Loading />}
            <div className="p-4 min-h-[80svh] flex flex-col justify-center gap-4">
                {tripId &&
                    <>
                        <div className="flex flex-col gap-2 md:gap-4 w-full md:w-auto justify-start text-sm">
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
                    className="w-full"
                    options={vehicles}
                    value={tripId}
                    onChange={setTripId}
                    searchTerm={vehicleSearch}
                    onSearchTermChange={setVehicleSearch}
                    placeholder="Select Vehicle"
                />
                {
                    tripId && (
                        <div className="buttons flex flex-col gap-2 items-center w-full">
                            <Button className={`w-full ${actionType === "destinationChange" ? "bg-green-500 text-white hover:bg-green-200 hover:text-black" : ""}`} onClick={() => setActionType("destinationChange")}>Destination Change</Button>
                            <Button className={`w-full ${actionType === "update" ? "bg-green-500 text-white hover:bg-green-200 hover:text-black" : ""}`} onClick={() => setActionType("update")}>Update</Button>
                            <Button className={`w-full ${actionType === "report" ? "bg-green-500 text-white hover:bg-green-200 hover:text-black" : ""}`} onClick={() => setActionType("report")}>Report</Button>
                            <Button className={`w-full ${actionType === "loaded" ? "bg-green-500 text-white hover:bg-green-200 hover:text-black" : ""}`} onClick={() => setActionType("loaded")}>Loaded</Button>
                        </div>
                    )
                }
                {/* <div className="flex flex-col gap-4 md:flex-row items-center justify-center md:flex-shrink-0 w-full md:justify-around">
                </div> */}
                <div className={actionType == undefined ? "hidden" : ""}>
                    {actionType == "report" &&
                        <div className="flex flex-col gap-2">
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
                                className={`${!Driver ? "bg-yellow-100" : ""}`}
                            />

                            <Label htmlFor="odometer">Odometer</Label>
                            <Input
                                id="odometer"
                                value={OdometerOnTrackUpdate === undefined ? "" : OdometerOnTrackUpdate}
                                onChange={(e) => setOdometerOnTrackUpdate(e.target.value === "" ? undefined : Number(e.target.value))}
                                type="number"
                                placeholder=""
                                className={`${!OdometerOnTrackUpdate ? "bg-yellow-100" : ""}`}
                            />

                            <Label htmlFor="locationRemark">Location Remark</Label>
                            <Input id="locationRemark" value={LocationRemark} onChange={(e) => setLocationRemark(e.target.value)} className={`${!LocationRemark ? "bg-yellow-100" : ""}`} type="string" placeholder="" />

                            <Label htmlFor="comment">Instruction/ Comment</Label>
                            <Input id="comment" value={ManagerComment} onChange={(e) => setManagerComment(e.target.value)} className={`${!ManagerComment ? "bg-yellow-100" : ""}`} type="string" placeholder="" />

                            <div className="flex gap-2 flex-row justify-between mt-2">
                                <Button className="w-full" variant="secondary" type="reset" onClick={() => resetForm()}>Reset</Button>
                                <Button className="w-full" type="button" onClick={() => submit()}>Submit</Button>
                            </div>
                        </div>
                    }
                    {actionType == "update" &&
                        <div className="flex flex-col gap-2">
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

                            <Label htmlFor="odometer">Odometer</Label>
                            <Input
                                id="odometer"
                                value={OdometerOnTrackUpdate === undefined ? "" : OdometerOnTrackUpdate}
                                onChange={(e) => setOdometerOnTrackUpdate(e.target.value === "" ? undefined : Number(e.target.value))}
                                className={`${!OdometerOnTrackUpdate ? "bg-yellow-100" : ""}`}
                                type="number"
                                placeholder=""
                            />

                            <Label htmlFor="locationRemark">Location Remark</Label>
                            <Input id="locationRemark" value={LocationRemark} onChange={(e) => setLocationRemark(e.target.value)} className={`${!LocationRemark ? "bg-yellow-100" : ""}`} type="string" placeholder="" />

                            <Label htmlFor="comment">Instruction/ Comment</Label>
                            <Input id="comment" value={ManagerComment} onChange={(e) => setManagerComment(e.target.value)} className={`${!ManagerComment ? "bg-yellow-100" : ""}`} type="string" placeholder="" />

                            <div className="flex gap-2 flex-row justify-between mt-2">
                                <Button className="w-full" variant="secondary" type="reset" onClick={() => resetForm()}>Reset</Button>
                                <Button className="w-full" type="button" onClick={() => submit()}>Submit</Button>
                            </div>
                        </div>
                    }
                    {actionType == "loaded" &&
                        <MarkLoaded
                            selectedTrip={data.find((trip) => trip._id == tripId)!}
                        />
                    }

                    {actionType == "destinationChange" && data.find((trip) => trip._id == tripId) &&
                        <DestinationChange
                            selectedTrip={data.find((trip) => trip._id == tripId)!}
                        />
                    }
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
