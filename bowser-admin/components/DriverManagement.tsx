"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DetailedVehicleData, Driver, TankersTrip } from "@/types";
import { BASE_URL } from "@/lib/api";
import { UserCog } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useVehiclesCache } from "@/src/context/VehiclesCacheContext";
import { searchItems } from "@/utils/searchUtils";
import { SearchModal } from "./SearchModal";
import Loading from "@/app/loading";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type DriverModalProps = {
    vehicle: DetailedVehicleData;
};

const DriverManagementModal: React.FC<DriverModalProps> = ({ vehicle }) => {
    const [loading, setLoading] = useState(false);
    const [updatingTrip, setUpdatingTrip] = useState<TankersTrip>()
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"none" | "add" | "leave" | "status">("none");
    const { cache, setCache } = useVehiclesCache()
    const [joiningDriver, setJoiningDriver] = useState<string>("")
    const [joiningDriverId, setJoiningDriverId] = useState<string>("")
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

    const [joining, setJoining] = useState({
        date: "",
        odometer: "",
        location: "",
        remark: "",
    });

    const [leaving, setLeaving] = useState({
        from: "",
        tillDate: "",
        odometer: "",
        location: "",
        remark: "",
    });

    const fetchTripOnLeavingDate = async (date: string) => {
        console.log('Called Fetching trip function')
        setLoading(true)
        try {
            const response = await fetch(`${BASE_URL}/driver-log/last-trip/${vehicle.vehicle.VehicleNo}/${date}`);
            const lastTripObj = await response.json();
            const latestTrip = lastTripObj.latestTrip;
            setUpdatingTrip(latestTrip)
            console.log(latestTrip)
        } catch (error) {
            console.log(error);
            toast.error('Error fetching trip on leaving date', { description: String(error) })
        } finally {
            setLoading(false)
        }
    }

    const [statusRemark, setStatusRemark] = useState("");

    const noDriver = vehicle.vehicle.tripDetails.driver === "no driver" || vehicle.driver.name === "no driver";

    // ---------------------------
    // API Handlers
    // ---------------------------
    const handleAddDriver = async () => {
        try {
            const res = await fetch(`${BASE_URL}/driver-log/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleNo: vehicle.vehicle.VehicleNo,
                    driverId: joiningDriverId,
                    driverName: joiningDriver,
                    joining,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setCache((prev) => {
                const updated = { ...prev.vehicleDetails };
                const target = updated[vehicle.vehicle._id];

                if (target) {
                    updated[vehicle.vehicle._id] = {
                        ...target,
                        driver: {
                            _id: joiningDriverId,
                            name: joiningDriver,
                            mobile: null,
                        },
                        vehicle: {
                            ...target.vehicle,
                            tripDetails: {
                                ...target.vehicle.tripDetails,
                                driver: joiningDriver,
                            },
                        },
                        lastDriverLog: data.entry,
                    };
                }

                return { ...prev, vehicleDetails: updated };
            });

            toast.success("Driver added");
            setOpen(false);
            setMode("none");
        } catch (err: any) {
            toast.error("Error", { description: err.message });
        }
    };

    const handleLeaveDriver = async () => {
        try {
            const res = await fetch(`${BASE_URL}/driver-log/leave`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleNo: vehicle.vehicle.VehicleNo,
                    driverId: vehicle.driver._id,
                    leaving,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setCache((prev) => {
                const updated = { ...prev.vehicleDetails };
                const target = updated[vehicle.vehicle._id];

                if (target) {
                    updated[vehicle.vehicle._id] = {
                        ...target,
                        driver: {
                            _id: null, name: "no driver", mobile: null, leaving: {
                                from: leaving.from,
                                odometer: Number(leaving.odometer),
                                location: leaving.location,
                                tripId: ""
                            }
                        },
                        vehicle: {
                            ...target.vehicle,
                            tripDetails: {
                                ...target.vehicle.tripDetails,
                                driver: "no driver",
                            },
                        },
                        lastDriverLog: data.entry,
                    };
                }

                return { ...prev, vehicleDetails: updated };
            });
            toast.success("Driver leaving updated");
            setOpen(false);
            setMode("none");
        } catch (err: any) {
            toast.error("Error", { description: err.message });
        }
    };

    const handleStatusUpdate = async () => {
        try {
            const res = await fetch(`${BASE_URL}/driver-log/status-update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleNo: vehicle.vehicle.VehicleNo,
                    remark: statusRemark,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setCache((prev) => {
                let updated = { ...prev.vehicleDetails };
                const target = updated[vehicle.vehicle._id];

                if (target) {
                    updated = {
                        ...updated,
                        [vehicle.vehicle._id]: {
                            ...target,
                            lastDriverLog: {
                                ...target.lastDriverLog,
                                statusUpdate: [
                                    ...(target.lastDriverLog?.statusUpdate || []),
                                    {
                                        dateTime: new Date(),
                                        remark: statusRemark,
                                    },
                                ],
                            },
                        },
                    };
                }

                return { ...prev, vehicleDetails: updated };
            });
            toast.success("Status updated");
            setOpen(false);
            setMode("none");
        } catch (err: any) {
            toast.error("Error", { description: err.message });
        }
    };

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
    const handleDriverSelection = (driver: Driver) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));
        console.log(driver._id);
        console.log(driver.Name);

        if (driver) {
            setJoiningDriver(driver.Name);
            setJoiningDriverId(driver._id);
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="icon">
                                    <UserCog />
                                </Button>
                            </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Manage Driver</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <DialogContent className="max-w-lg">
                    {loading && <Loading />}
                    <DialogHeader>
                        <DialogTitle className="text-center">Driver Management</DialogTitle>
                        <DialogDescription className="text-card-foreground">
                            <span className="text-lg">
                                {vehicle.vehicle.VehicleNo}
                            </span>
                            {noDriver ? ` No active driver since
                            ${vehicle.driver.leaving?.from
                                    ? `${Math.round(
                                        Math.abs(
                                            Number(new Date()) - Number(new Date(vehicle.driver.leaving.from))
                                        ) / (1000 * 60 * 60 * 24)
                                    )} Days`
                                    : ""}
                            ` : ` ${vehicle.driver.name} is currently assigned`}
                        </DialogDescription>
                    </DialogHeader>

                    {/* MODE: NONE → Buttons */}
                    {mode === "none" && (
                        <div className="space-y-4">
                            {!noDriver ? (
                                <Button onClick={() => setMode("leave")}>Update Driver Leaving</Button>
                            ) : (
                                <>
                                    <div className="p-2 border rounded">
                                        <p className="mb-2">Last Leaving:</p>
                                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-lg">
                                            <span className="font-medium">Date:</span>
                                            <span>{formatDate(vehicle.driver.leaving?.from!)}</span>

                                            {vehicle.driver.leaving?.tillDate && (
                                                <>
                                                    <span className="font-medium">Till:</span>
                                                    <span>{formatDate(vehicle.driver.leaving?.tillDate)}</span>
                                                </>
                                            )}

                                            <span className="font-medium">Driver:</span>
                                            <span>{vehicle.driver.name}</span>

                                            <span className="font-medium">Remark:</span>
                                            <span>{vehicle.driver.leaving?.remark}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button onClick={() => setMode("add")}>Add Driver</Button>
                                        <Button variant="outline" onClick={() => setMode("status")}>
                                            Add Status Update
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* MODE: ADD DRIVER */}
                    {mode === "add" && (
                        <div className="space-y-3">
                            <Label htmlFor="joiningDate">Joining Date</Label>
                            <Input
                                id="joiningDate"
                                type="date"
                                value={joining.date}
                                onChange={(e) => setJoining({ ...joining, date: e.target.value })}
                            />
                            <Label htmlFor="joiningDriver">Joining Driver</Label>
                            <Input
                                id="joiningDriver"
                                placeholder="Enter Joinig Driver ITPLId"
                                value={joiningDriver}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setJoiningDriver(value);
                                    const nativeEvent = e.nativeEvent as InputEvent;
                                    if (nativeEvent.inputType === "insertText" && e.currentTarget.value.length > 3) {
                                        searchDriver(value);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Backspace") {
                                        return;
                                    }
                                    if (e.key === 'Enter' && joiningDriver.length > 3) {
                                        e.preventDefault();
                                        searchDriver(joiningDriver);
                                    }
                                }}
                                required
                            />
                            <Label htmlFor="joiningOdometer">Odometer</Label>
                            <Input
                                id="joiningOdometer"
                                type="string"
                                placeholder=""
                                value={Number(joining.odometer) || 0}
                                onChange={(e) => setJoining({ ...joining, odometer: e.target.value })}
                            />
                            <Label htmlFor="joiningLocation">Location</Label>
                            <Input
                                id="joiningLocation"
                                value={joining.location}
                                onChange={(e) => setJoining({ ...joining, location: e.target.value })}
                            />
                            <Label htmlFor="joiningRemark">Remark</Label>
                            <Input
                                id="joiningRemark"
                                value={joining.remark}
                                onChange={(e) => setJoining({ ...joining, remark: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleAddDriver}>Submit</Button>
                                <Button variant="ghost" onClick={() => setMode("none")}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {/* MODE: LEAVE DRIVER */}
                    {mode === "leave" && (
                        <div className="space-y-3">
                            <Label htmlFor="leavingDate">Leaving Date</Label>
                            <Input
                                id="leavingDate"
                                type="date"
                                value={leaving.from}
                                onChange={(e) => { setLeaving({ ...leaving, from: e.target.value }); fetchTripOnLeavingDate(e.target.value) }}
                            />
                            {updatingTrip && leaving.from && (
                                <div className="gap-y-2">
                                    <strong className="text-lg">Trip on leaving</strong><br />
                                    <div className="grid grid-cols-[auto_1fr] gap-x-2 text-lg">
                                        <span>
                                            <strong>Load Status: </strong>
                                        </span>
                                        <span>
                                            {updatingTrip.LoadStatus == 1 ? "Loaded" : "Empty"}
                                        </span>

                                        <span>
                                            <strong>Start Date: </strong>
                                        </span>
                                        <span>
                                            {formatDate(updatingTrip.StartDate)}
                                        </span>

                                        <span>
                                            <strong>Route: </strong>
                                        </span>
                                        <span>
                                            {updatingTrip.StartFrom} - {updatingTrip.EndTo}
                                        </span>

                                        <span><strong>Driver: </strong></span>
                                        <span>{updatingTrip.StartDriver}</span>
                                    </div>
                                </div>
                            )}
                            <Label htmlFor="tillDate">Till Date (if on leave)</Label>
                            <Input
                                id="tillDate"
                                type="date"
                                value={leaving.tillDate}
                                onChange={(e) => setLeaving({ ...leaving, tillDate: e.target.value })}
                            />
                            <Label htmlFor="odometer">Odometer</Label>
                            <Input
                                id="odometer"
                                type="number"
                                value={leaving.odometer}
                                onChange={(e) => setLeaving({ ...leaving, odometer: e.target.value })}
                            />
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={leaving.location}
                                onChange={(e) => setLeaving({ ...leaving, location: e.target.value })}
                            />
                            <Label htmlFor="remark">Remark</Label>
                            <Input
                                id="remark"
                                value={leaving.remark}
                                onChange={(e) => setLeaving({ ...leaving, remark: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleLeaveDriver}>Submit</Button>
                                <Button variant="ghost" onClick={() => setMode("none")}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {/* MODE: STATUS UPDATE */}
                    {mode === "status" && (
                        <div className="space-y-3">
                            <Label htmlFor="statusRemark">Status Remark</Label>
                            <Input
                                id="statusRemark"
                                value={statusRemark}
                                onChange={(e) => setStatusRemark(e.target.value)}
                                placeholder="Enter status remark"
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleStatusUpdate}>Submit</Button>
                                <Button variant="ghost" onClick={() => setMode("none")}>Cancel</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
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
    );
};

export default DriverManagementModal;
