"use client";

import React, { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Ban, ListFilter } from "lucide-react";

import { DetailedVehicleData, InactiveVehicles, TransAppUser } from "@/types";
import { useVehiclesCache } from "@/src/context/VehiclesCacheContext";
import { BASE_URL } from "@/lib/api";
import { fetchUserVehicles } from "@/utils/transApp";
import DriverManagementModal from "../DriverManagement";

const VehicleManagement = ({ user }: { user: TransAppUser | undefined }) => {
    const { cache, setCache } = useVehiclesCache();
    const [vehicles, setVehicles] = useState<DetailedVehicleData[]>([]);
    const [inactiveVehicles, setInactiveVehicles] = useState<InactiveVehicles[]>([]);
    const [filterNoDriver, setFilterNoDriver] = useState(false);

    useEffect(() => {
        if (!user?._id) return;

        if (cache.vehicleDetails && Object.keys(cache.vehicleDetails).length > 0) {
            setVehicles(Object.values(cache.vehicleDetails));
            return;
        }

        // Otherwise fetch and update cache
        fetchUserVehicles(user._id)
            .then((data) => {
                setVehicles(data);
                setCache((prev) => ({
                    ...prev,
                    vehicleDetails: Object.fromEntries(data.map((v) => [v.vehicle._id, v]))
                }));
            })
            .catch((err) => {
                console.error(err);
                toast.error("Failed to load vehicles", { description: String(err) });
            });
    }, [user?._id]);

    useEffect(() => {
        if (cache.vehicleDetails) {
            setVehicles(Object.values(cache.vehicleDetails));
        }
    }, [cache.vehicleDetails]);

    const deleteVehicle = async (vehicleNo: string) => {
        let confirmation = confirm(`Do you want to delete the vehicle ${vehicleNo}?`);
        if (!confirmation) return;

        try {
            const res = await fetch(`${BASE_URL}/trans-app/manage-profile/delete-vehicle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vehicleNo, userName: user?.name }),
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error("Error in request", { description: data.error, richColors: true });
                return;
            }

            toast.success(data.message, {
                description: `${vehicleNo} has been deleted.`, richColors: true
            });

            setVehicles((prev) => prev.filter((v) => v.vehicle.VehicleNo !== vehicleNo));
        } catch (error) {
            console.error(error);
            toast.error("An error occurred", { description: String(error), richColors: true });
        }
    };

    const deActivateVehicle = async (vehicleNo: string) => {
        let confirmation = confirm(`Do you want to deactivate the vehicle ${vehicleNo}?`);
        if (!confirmation) return;

        try {
            const res = await fetch(`${BASE_URL}/trans-app/manage-profile/deactivate-vehicle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vehicleNo, userName: user?.name }),
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error("Error in request", { description: data.error, richColors: true });
                return;
            }

            toast.success(data.message, {
                description: `${vehicleNo} has been marked as inactive.`, richColors: true
            });

            fetchInactiveVehicles();
        } catch (error) {
            console.error(error);
            toast.error("An error occurred", { description: String(error), richColors: true });
        }
    };

    const fetchInactiveVehicles = async () => {
        try {
            const res = await fetch(`${BASE_URL}/trans-app/manage-profile/inactive-vehicles/${user?._id}`);
            const data = await res.json();

            if (res.ok) {
                setInactiveVehicles(data.deactivatedVehiclesList);
            } else {
                toast.warning(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch inactive vehicle, richColors:trues");
        }
    };

    return (
        <Table className='w-full min-w-max'>
            <TableHeader>
                <TableRow>
                    <TableHead>Sn</TableHead>
                    <TableHead>Vehicle no.</TableHead>
                    <TableHead className="flex flex-row gap-3 items-center">Driver <ListFilter size={16} onClick={() => setFilterNoDriver(filterNoDriver ? false : true)} /></TableHead>
                    {vehicles.some(v => v.vehicle.tripDetails.driver === "no driver") && (
                        <TableHead>No Driver Since</TableHead>
                    )}
                    <TableHead>Last Comment</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {vehicles.filter(vehicle => {
                    if (!filterNoDriver) return true; // show all
                    return vehicle.vehicle.tripDetails.driver === "no driver"; // filter
                }).map((v, index) => {
                    const { VehicleNo } = v.vehicle;
                    const isInactive = inactiveVehicles.findIndex((i) => i.VehicleNo === VehicleNo) !== -1;

                    return (
                        <TableRow key={v.vehicle._id} className={isInactive ? "bg-red-300" : "" + v.vehicle.tripDetails.driver == "no driver" ? "text-destructive" : ""}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{VehicleNo}</TableCell>
                            {/* {v.vehicle.tripDetails.driver !== "no driver" ? v.driver?.name : `${v.lastDriverLog?.leaving?.tillDate ? `${v.driver.name} On leave til` + formatDate(v.lastDriverLog?.leaving?.tillDate) : `${v.driver.name} left the vehicle from ${formatDate(v.driver.leaving!.from)}`}` || "—"} */}
                            <TableCell>{v.vehicle.tripDetails.driver.toUpperCase()}</TableCell>
                            <TableCell>
                                {v.driver.leaving?.from
                                    ? `${Math.round(
                                        Math.abs(
                                            Number(new Date()) - Number(new Date(v.driver.leaving.from))
                                        ) / (1000 * 60 * 60 * 24)
                                    )} Days`
                                    : ""}
                            </TableCell>
                            <TableCell>{v.lastDriverLog?.statusUpdate?.[v.lastDriverLog?.statusUpdate?.length - 1]?.remark || v.lastDriverLog?.leaving?.remark}</TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    onClick={() => deleteVehicle(VehicleNo)}
                                                    variant="destructive"
                                                    size="icon"
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete Vehicle</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    {!isInactive && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        onClick={() => deActivateVehicle(VehicleNo)}
                                                        variant="secondary"
                                                        size="icon"
                                                    >
                                                        <Ban />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Mark Inactive</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DriverManagementModal vehicle={v} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Manage Driver</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};

export default VehicleManagement;
