"use client";

import React, { useEffect, useState } from "react";
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
import { DetailedVehicleData, Driver } from "@/types";
import { BASE_URL } from "@/lib/api";
import { UserCog } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useVehiclesCache } from "@/src/context/VehiclesCacheContext";
import { searchItems } from "@/utils/searchUtils";
import { SearchModal } from "./SearchModal";

type DriverModalProps = {
    vehicle: DetailedVehicleData;
};

const DriverManagementModal: React.FC<DriverModalProps> = ({ vehicle }) => {
    const [loading, setLoading] = useState(false);
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

    const [statusRemark, setStatusRemark] = useState("");

    const noDriver = vehicle.vehicle.tripDetails.driver === "no driver";
    const lastLog = vehicle.lastDriverLog;

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
                        lastDriverLog: data.entry, // the leaving log
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
                <DialogTrigger asChild>
                    <Button variant="secondary" size="icon">
                        <UserCog />
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
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
                            ` : " Driver is currently assigned"}
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
                            <Label>Joining Date</Label>
                            <Input
                                type="date"
                                value={joining.date}
                                onChange={(e) => setJoining({ ...joining, date: e.target.value })}
                            />
                            <Label>Joining Driver</Label>
                            <Input
                                id="driverId"
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
                            <Label>Odometer</Label>
                            <Input
                                type="string"
                                placeholder=""
                                value={Number(joining.odometer) || 0}
                                onChange={(e) => setJoining({ ...joining, odometer: e.target.value })}
                            />
                            <Label>Location</Label>
                            <Input
                                value={joining.location}
                                onChange={(e) => setJoining({ ...joining, location: e.target.value })}
                            />
                            <Label>Remark</Label>
                            <Input
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
                            <Label>Leaving Date</Label>
                            <Input
                                type="date"
                                value={leaving.from}
                                onChange={(e) => setLeaving({ ...leaving, from: e.target.value })}
                            />
                            <Label>Till Date (if on leave)</Label>
                            <Input
                                type="date"
                                value={leaving.tillDate}
                                onChange={(e) => setLeaving({ ...leaving, tillDate: e.target.value })}
                            />
                            <Label>Odometer</Label>
                            <Input
                                type="number"
                                value={leaving.odometer}
                                onChange={(e) => setLeaving({ ...leaving, odometer: e.target.value })}
                            />
                            <Label>Location</Label>
                            <Input
                                value={leaving.location}
                                onChange={(e) => setLeaving({ ...leaving, location: e.target.value })}
                            />
                            <Label>Remark</Label>
                            <Input
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
                            <Label>Status Remark</Label>
                            <Input
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
