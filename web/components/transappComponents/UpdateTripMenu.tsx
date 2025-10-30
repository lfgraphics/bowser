"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BASE_URL } from "@/lib/api";
import { DetailedVehicleData, TransAppUser, TripStatusUpdateEnums } from "@/types";

type Props = {
    trip: DetailedVehicleData["latestTrip"];
    vehicleNo: string;
    user?: TransAppUser;
    statusLabel: string; // computed in parent for consistency
};

const UpdateTripMenu: React.FC<Props> = ({ trip, vehicleNo, user, statusLabel }) => {
    const isAdmin = Boolean(user?.Division?.includes("Admin"));

    // Dialog states
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [isAdminOrderOpen, setIsAdminOrderOpen] = useState(false);
    const [remark, setRemark] = useState("");

    const nextAction = useMemo(() => {
        // Map from status label to next action label + destination
        // Loaded On Way -> Report (unloading-tracker)
        // Loaded Reported -> Unload (unloading-tracker)
        // Unloaded - Not Planned -> Give Plan (loading-planner)
        // Empty On Way -> Report (loading-tracker)
        // Empty Reported -> Mark Loaded (trip-update)
        const label = statusLabel?.toLowerCase();
        if (!label) return null;

        if (label.includes("loaded on way")) {
            return {
                text: "Reported (Unloading Station)",
                href: {
                    pathname: "trans-app/unloading-tracker",
                    query: { actionType: "report", tripId: trip?._id },
                },
            } as const;
        }
        if (label.includes("loaded reported")) {
            return {
                text: "Unload",
                href: {
                    pathname: "trans-app/unloading-tracker",
                    query: { actionType: "unload", tripId: trip?._id },
                },
            } as const;
        }
        if (label.includes("unloaded")) {
            return {
                text: "Give Plan",
                href: {
                    pathname: "trans-app/loading-planner",
                    query: {
                        tripId: trip._id
                    }
                }
            } as const;
        }
        if (label.includes("empty on way")) {
            return {
                text: "Reported (Loading Station)",
                href: {
                    pathname: "trans-app/loading-tracker",
                    query: { actionType: "report", tripId: trip?._id },
                },
            } as const;
        }
        if (label.includes("empty reported")) {
            return {
                text: "Mark Loaded",
                href: `/trans-app/trip-update/${trip?._id}`,
            } as const;
        }
        return null;
    }, [statusLabel, trip?._id, vehicleNo]);

    const submitStatusUpdate = async (status: TripStatusUpdateEnums, comment?: string) => {
        try {
            const obj = {
                dateTime: new Date(),
                user: {
                    _id: user?._id,
                    name: user?.name,
                },
                status,
                comment,
            };

            const url = `${BASE_URL}/trans-app/trip-update/update-trip-status/${trip?._id}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statusUpdate: obj }),
            });

            if (!res.ok) throw new Error("Network Request Failed");
            toast.success("Trip status updated successfully", { richColors: true });
        } catch (error) {
            console.error(error);
            toast.error("Error", { description: String(error), richColors: true });
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Update</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Trip Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setIsCustomOpen(true)}>Custom Update</DropdownMenuItem>
                    {nextAction && (
                        <>
                            <DropdownMenuSeparator />
                            {typeof nextAction.href === "string" ? (
                                <DropdownMenuItem asChild>
                                    <Link href={nextAction.href}>{nextAction.text}</Link>
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem asChild>
                                    <Link href={nextAction.href}>{nextAction.text}</Link>
                                </DropdownMenuItem>
                            )}
                        </>
                    )}
                    {isAdmin && (
                        <>
                            <DropdownMenuSeparator />
                            {/* setIsAdminOrderOpen(true) */}
                            <DropdownMenuItem onClick={() => toast.info("Order to the supervisor action will be implemented soon.")}>Order</DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Custom Update Dialog */}
            <AlertDialog open={isCustomOpen} onOpenChange={setIsCustomOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Custom Update</AlertDialogTitle>
                        <AlertDialogDescription>
                            Provide a remark for this update. It will be saved as a custom status update for this trip.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="custom-remark">Remark</Label>
                        <Input id="custom-remark" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Enter remark" />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRemark("")}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                await submitStatusUpdate("Custom", remark || undefined);
                                setRemark("");
                                setIsCustomOpen(false);
                            }}
                        >
                            Submit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Admin Order Dialog */}
            <AlertDialog open={isAdminOrderOpen} onOpenChange={setIsAdminOrderOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Order</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter an order/remark for this trip. This will be saved as a custom update.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="admin-order-remark">Remark</Label>
                        <Input id="admin-order-remark" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Enter order remark" />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRemark("")}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                await submitStatusUpdate("Custom", remark || undefined);
                                setRemark("");
                                setIsAdminOrderOpen(false);
                            }}
                        >
                            Submit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default UpdateTripMenu;
