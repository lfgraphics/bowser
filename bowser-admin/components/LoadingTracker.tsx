"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import Combobox, { ComboboxOption } from "./Combobox"
import { Driver, StackHolder, TankersTrip } from "@/types"
import { getLocalDateTimeString } from "@/utils"
import { BASE_URL } from "@/lib/api"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import Loading from "@/app/loading"
import { searchItems } from "@/utils/searchUtils"
import { SearchModal } from "./SearchModal"
import DestinationChange from "./transappComponents/DestinationChange"
import MarkLoaded from "./transappComponents/MarkLoaded"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import { Card, CardContent, CardHeader } from "./ui/card"

export default function UnloadedPlannedVehicleTracker({ tripsData, query }: { tripsData: TankersTrip[], query: { actionType: "update" | "report" | "loaded" | "destinationChange" | undefined; tripId: string } }) {
    const queryAction = query?.actionType
    const [loading, setLoading] = useState(false)
    const [actionType, setActionType] = useState<"update" | "report" | "loaded" | "destinationChange" | undefined>(queryAction)
    const [TrackUpdateDate, setTrackUpdateDate] = useState<Date | undefined>(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined)
    const [OdometerOnTrackUpdate, setOdometerOnTrackUpdate] = useState<number | undefined>(undefined)
    const [LocationRemark, setLocationRemark] = useState<string>("")
    const [ManagerComment, setManagerComment] = useState<string>("")
    const [data, setData] = useState<TankersTrip[]>(tripsData || [])
    const [vehicleSearch, setVehicleSearch] = useState<string>("")
    const [Driver, setDriver] = useState<string>("");
    const [stackHolder, setStackHolder] = useState<StackHolder>();
    const [loadingSuperVisor, setLoadingSuperVisor] = useState<string>('')
    const [loadingSuperVisorUpdate, setLoadingSuperVisorUpdate] = useState<string>('')
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

    const [tripId, setTripId] = useState<string>(query.tripId)

    useEffect(() => {
        if (actionType === "report") {
            setTrackUpdateDate(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined);
            setLocationRemark(data.find(trip => trip?._id === tripId)?.EndTo.toUpperCase() || "");
            setManagerComment("Arrival #REPORTED by the vehicle at [" + data.find(trip => trip?._id === tripId)?.EndTo + "]");
            (!loadingSuperVisor || loadingSuperVisor.length == 0) && fetchStackHolders();
        }
        if (actionType === "update") {
            setTrackUpdateDate(getLocalDateTimeString() ? new Date(getLocalDateTimeString()) : undefined);
            setLocationRemark("");
            setManagerComment("#UPDATE ");
        }
    }, [actionType, tripId]);

    const resetForm = () => {
        setTripId("");
        setActionType(undefined);
    }

    const submit = async () => {
        setLoading(true);
        const url = `${BASE_URL}/trans-app/trip-update/${actionType}`;
        const data = {
            TrackUpdateDate,
            OdometerOnTrackUpdate,
            LocationOnTrackUpdate: LocationRemark,
            LocationRemark,
            ManagerComment,
            Driver,
            loadingSuperVisor: loadingSuperVisorUpdate?.trim().length > 3 ? loadingSuperVisorUpdate : loadingSuperVisor
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
            loadingSuperVisorUpdate && loadingSuperVisorUpdate.length > 3 && !loadingSuperVisor && await updateLoadingSuperVisor();
        } catch (error) {
            console.error("Error submitting trip update:", error);
            toast.error("An error occurred while submitting the trip update.", { richColors: true });
        } finally {
            setLoading(false)
        }
    }

    const updateLoadingSuperVisor = async () => {
        if (!stackHolder) { toast.error('no stackholder found'); return }
        console.log(stackHolder)
        console.log(stackHolder._id)
        if (!loadingSuperVisorUpdate || loadingSuperVisorUpdate.length < 3) return;
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/trans-app/stack-holders/update-loading-supervisor/${stackHolder._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loadingSupervisor: loadingSuperVisorUpdate })
            });
            if (!res.ok) {
                toast.error('Failed to update loading supervisor', { richColors: true });
                return;
            }
            toast.success('Loading supervisor updated', { richColors: true });
        } catch (error) {
            console.error('Error updating loading supervisor:', error);
            toast.error('An error occurred while updating loading supervisor', { richColors: true });
        } finally {
            setLoading(false);
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

    const fetchStackHolders = async () => {
        try {
            const response = await fetch(`${BASE_URL}/trans-app/stack-holders/system/${data.find(trip => trip?._id === tripId)?.EndTo}`);
            const responseData = await response.json();
            if (!response.ok) return;
            setStackHolder(responseData[0])
            console.log(responseData[0])
            setLoadingSuperVisor(responseData[0].loadingSupervisor);
        } catch (error) {
            console.error('Error fetching fuel providers:', error);
        }
    }

    return (
        <>
            {loading && <Loading />}
            <div className="p-4 min-h-[80svh] flex flex-col justify-center gap-4">
                {tripId &&
                    <>
                        <div className="flex flex-col gap-2 md:gap-4 w-full md:w-auto justify-start text-sm">
                            id: {tripId}
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
                            <Button disabled className={`w-full ${actionType === "loaded" ? "bg-green-500 text-white hover:bg-green-200 hover:text-black" : ""}`} onClick={() => setActionType("loaded")}>Loaded</Button>
                        </div>
                    )
                }
                {/* <div className="flex flex-col gap-4 md:flex-row items-center justify-center md:flex-shrink-0 w-full md:justify-around">
                </div> */}
                <div className={actionType == undefined ? "hidden" : ""}>
                    {actionType == "report" &&
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="dateTime">Reported on</Label>
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

                            {(() => {
                                const endTo = data.find(trip => trip?._id === tripId)?.EndTo;

                                // const updateStackHolders = async (newSupervisor: string) => {
                                //     if (!endTo) return;
                                //     try {
                                //         const res = await fetch(`${BASE_URL}/trans-app/stack-holders/system/${endTo}`, {
                                //             method: "PUT",
                                //             headers: { "Content-Type": "application/json" },
                                //             body: JSON.stringify({ loadingSupervisor: newSupervisor }),
                                //         });
                                //         if (!res.ok) {
                                //             const txt = await res.text();
                                //             console.error("Failed to update stack holders:", txt);
                                //             toast.error("Failed to update stack holders", { description: txt, richColors: true });
                                //             return;
                                //         }
                                //         // reflect the newly saved supervisor in state
                                //         setLoadingSuperVisor(newSupervisor);
                                //         toast.success("Stackholders updated", { richColors: true });
                                //     } catch (err) {
                                //         console.error("Error updating stack holders:", err);
                                //         toast.error("Error updating stack holders", { richColors: true });
                                //     }
                                // };

                                const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                    setLoadingSuperVisorUpdate(e.target.value);
                                };

                                // const handleBlur = () => {
                                // If no loading supervisor existed in the fetched stackholders,
                                // create/update it in the DB when the user provides a value.
                                // if ((!loadingSuperVisor || loadingSuperVisor.length === 0) && loadingSuperVisorUpdate && loadingSuperVisorUpdate.length > 0) {
                                //     updateStackHolders(loadingSuperVisorUpdate);
                                // }
                                // If a loadingSupervisor existed, we only track the user's input (loadingSuperVisorUpdate)
                                // and do not call the DB update here. The value will be submitted with the main submit().
                                // };

                                return (
                                    <>
                                        <Label htmlFor="loadingSuperviser">Loading Supervisor</Label>
                                        <Input
                                            id="loadingSuperviser"
                                            value={loadingSuperVisorUpdate ? loadingSuperVisorUpdate : loadingSuperVisor ? loadingSuperVisor : ""}
                                            onChange={handleChange}
                                            // onBlur={handleBlur}
                                            type="text"
                                            placeholder=""
                                            className={`${(!loadingSuperVisor && !loadingSuperVisorUpdate) ? "bg-yellow-100" : ""}`}
                                        />
                                    </>
                                );
                            })()}

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

            {data.find(trips => trips?._id == tripId)?.TravelHistory &&
                <Accordion type="single" collapsible className="mb-2 p-4 w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="mb-2 w-full text-left">Travel History</AccordionTrigger>
                        <AccordionContent>
                            {data.find(trips => trips?._id == tripId)?.TravelHistory.map((history, index) => (
                                <Card key={index} className="mb-4">
                                    <CardHeader>
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold">{(history.ManagerComment.match(/#(\w+)/) || [])[1] + " on " + formatDate(history.TrackUpdateDate)}</span>
                                            <span className="text-sm text-muted-foreground"><strong>Driver: </strong> {history.Driver}</span>
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
