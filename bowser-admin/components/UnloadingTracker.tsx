"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader } from "./ui/card"
import Combobox, { ComboboxOption } from "./Combobox"
import { TankersTrip, Driver } from "@/types"
import { getLocalDateTimeString } from "@/utils"
import { BASE_URL } from "@/lib/api"
import { toast } from "sonner"
import Loading from "@/app/loading"
import { formatDate } from "@/lib/utils"
import { Accordion } from "@radix-ui/react-accordion"
import { AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import { searchItems } from "@/utils/searchUtils"
import { SearchModal } from "./SearchModal"

export default function LoadVehicleTracker({ tripsData }: { tripsData: TankersTrip[] }) {
    const [loading, setLoading] = useState<boolean>(false)
    const [actionType, setActionType] = useState<"update" | "report" | "unload" | undefined>(undefined)
    const [TrackUpdateDate, setTrackUpdateDate] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [OdometerOnTrackUpdate, setOdometerOnTrackUpdate] = useState<number | undefined>(undefined)
    const [LocationRemark, setLocationRemark] = useState<string>("")
    const [ManagerComment, setManagerComment] = useState<string>("")
    const [data, setData] = useState<TankersTrip[]>(tripsData || [])
    const [tripId, setTripId] = useState<string>("")
    const [Driver, setDriver] = useState<string>("")
    const [vehicleSearch, setVehicleSearch] = useState<string>("")
    const trips: ComboboxOption[] = useMemo(() => {
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
        setDriver(data.find(trip => trip?._id === tripId)?.StartDriver || "no driver");
        if (actionType === "report") {
            setTrackUpdateDate(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined);
            setLocationRemark(data.find(trip => trip?._id === tripId)?.EndTo.toUpperCase() || "");
            setManagerComment("Arrival #REPORTED by the vehicle at [" + data.find(trip => trip?._id === tripId)?.TallyLoadDetail.Consignee.toUpperCase() + "]");
        }
        if (actionType === "unload") {
            setTrackUpdateDate(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined);
            setLocationRemark(data.find(trip => trip?._id === tripId)?.EndTo.toUpperCase() || "");
            setManagerComment("The vehicle has been #UNLOADED at [" + data.find(trip => trip?._id === tripId)?.TallyLoadDetail.Consignee.toUpperCase() + "]");
        }
        if (actionType === "update") {
            setTrackUpdateDate(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined);
            setLocationRemark("");
            setManagerComment("");
        }
        console.log(data.find(trip => trip?._id === tripId)?.TravelHistory, "Travel History for tripId:", tripId);
    }, [actionType, tripId, data]);

    const resetForm = () => {
        setTripId("");
        setActionType(undefined);
    }

    const validateData = () => {
        if (!tripId) {
            toast.error("Please select a vehicle.", {
                richColors: true
            });
            return false;
        }
        if (!TrackUpdateDate) {
            toast.error("Please select a date and time.", {
                richColors: true
            });
            window.location.hash = "dateTime";
            return false;
        }
        if (OdometerOnTrackUpdate === undefined || OdometerOnTrackUpdate < 0) {
            toast.error("Please enter a valid odometer reading.", {
                richColors: true
            });
            window.location.hash = "odometer";
            return false;
        }
        if (!LocationRemark) {
            toast.error("Please enter a location remark.", {
                richColors: true
            });
            window.location.hash = "locationRemark";
            return false;
        }
        if (!ManagerComment) {
            toast.error("Please enter a valid comment/ instruction about the update.", {
                richColors: true
            });
            window.location.hash = "comment";
            return false;
        }
        return true;
    }

    const submit = async () => {
        // if (!validateData()) return;
        const url = `${BASE_URL}/trans-app/trip-update/${actionType}`;
        const updateData = {
            TrackUpdateDate: TrackUpdateDate || new Date(),
            OdometerOnTrackUpdate: OdometerOnTrackUpdate || 0,
            LocationOnTrackUpdate: LocationRemark,
            ManagerComment,
            Driver
        }

        setLoading(true);
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tripId,
                    data: updateData
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                console.error("Failed to submit trip update:", error);
                toast.error("Failed to submit trip update", {
                    description: error.error.text(),
                    richColors: true
                });
                return;
            }
            setData(prevData =>
                prevData.map(trip =>
                    trip?._id === tripId
                        ? {
                            ...trip,
                            TravelHistory: [...(trip?.TravelHistory || []), updateData]
                        }
                        : trip
                )
            );
            toast.success("Trip update submitted successfully!", { richColors: true });
        } catch (error) {
            console.error("Error submitting trip update:", error);
            toast.error("An error occurred while submitting the trip update.", { richColors: true });
        } finally {
            setLoading(false);
        }
    }

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
                        <div className="flex flex-col gap-2 md:gap-4 w-full  justify-start text-sm">
                            <h4 className="text-lg font-semibold">Trip Details</h4>
                            <div className="flex">
                                <strong>Started From: </strong>{data.find(trip => trip?._id === tripId)?.StartFrom || "N/A"}
                            </div>
                            <div className="flex">
                                <strong>Loading Date: </strong>{formatDate(String(data.find(trip => trip?._id === tripId)?.StartDate))}
                            </div>
                            <div className="flex">
                                <strong>Unloading Factory: </strong> {data.find(trip => trip?._id === tripId)?.TallyLoadDetail.Consignee || "N/A"}
                            </div>
                            <div className="flex">
                                <strong>Ending Location: </strong> {data.find(trip => trip?._id === tripId)?.EndTo || "N/A"}
                            </div>
                            <div className="flex">
                                <strong>Starat Driver: </strong> {data.find(trip => trip?._id === tripId)?.StartDriver || "N/A"}
                            </div>
                        </div>
                    </>
                }
                <Combobox
                    className="w-full "
                    options={trips}
                    value={tripId}
                    onChange={setTripId}
                    searchTerm={vehicleSearch}
                    onSearchTermChange={setVehicleSearch}
                    placeholder="Select Vehicle"
                />
                {
                    tripId && (
                        <div className="buttons flex flex-col gap-2 items-center w-full">
                            <Button className={`w-full ${actionType === "update" ? "bg-green-500 text-white hover:bg-green-300 hover:text-black" : ""}`} onClick={() => setActionType("update")}>Update</Button>
                            <Button className={`w-full ${actionType === "report" ? "bg-green-500 text-white hover:bg-green-300 hover:text-black" : ""}`} onClick={() => setActionType("report")}>Report</Button>
                            <Button className={`w-full ${actionType === "unload" ? "bg-green-500 text-white hover:bg-green-300 hover:text-black" : ""}`} onClick={() => setActionType("unload")}>Unload</Button>
                        </div>
                    )
                }
                {/* <div className="flex flex-col gap-4 md:flex-row items-center justify-center md:flex-shrink-0 w-full md:justify-around">
                </div> */}
                <div className={actionType == undefined ? "hidden" : ""}>
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
                        className={`${(!OdometerOnTrackUpdate || OdometerOnTrackUpdate <= 0) ? "bg-yellow-100" : ""} text-foreground`}
                        type="string"
                        placeholder="Enter Odometer"
                    />

                    <Label htmlFor="locationRemark">Location Remark</Label>
                    <Input id="locationRemark" value={LocationRemark} onChange={(e) => setLocationRemark(e.target.value)} className={`${!LocationRemark ? "bg-yellow-100" : ""}`} type="string" placeholder="" />

                    <Label htmlFor="comment">Instruction/ Comment</Label>
                    <Input id="comment" value={ManagerComment} onChange={(e) => setManagerComment(e.target.value)} className={`${!ManagerComment ? "bg-yellow-100" : ""}`} type="string" placeholder="" />

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

                    <div className="flex gap-2 flex-row justify-between mt-2">
                        <Button className="w-full " variant="secondary" type="reset" onClick={() => resetForm()}>Reset</Button>
                        <Button className="w-full " type="button" onClick={() => submit()}>Submit</Button>
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

                {data.find(trips => trips?._id == tripId)?.TravelHistory &&
                    <Accordion type="single" collapsible className="mb-2 p-4 w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="mb-2 w-full text-left">Travel History</AccordionTrigger>
                            <AccordionContent>
                                {data.find(trips => trips?._id == tripId)?.TravelHistory.map((history, index) => (
                                    <Card key={index} className="mb-4">
                                        <CardHeader>
                                            <div className="flex flex-col items-start">
                                                <span className="font-semibold">{formatDate(history.TrackUpdateDate)}</span>
                                                <span className="text-sm text-muted-foreground">{history.Driver}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-col gap-2">
                                                <div>
                                                    <strong>Location:</strong> {history.LocationOnTrackUpdate}
                                                </div>
                                                <div>
                                                    <strong>Odometer:</strong> {history.OdometerOnTrackUpdate}
                                                </div>
                                                <div>
                                                    <strong>Comment:</strong> {history.ManagerComment}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                }
            </div>
        </>
    )
}
