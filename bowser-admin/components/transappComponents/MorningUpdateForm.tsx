"use client"

import React, { useEffect, useMemo, useState } from "react";

import { Phone, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DetailedVehicleData, TransAppUser } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchUserVehicles } from "@/utils/transApp";
import { saveFormData, loadFormData, clearFormData } from "@/lib/storage";
import { updateDriverMobile } from "@/utils/index";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    user: TransAppUser | undefined;
    onSuccess?: (reportData: {
        user: { name: string },
        date: string,
        openingTime: string,
        closingTime: string,
        vehicles: Array<{ vehicleNo: string, route: string, remark: string }>
    }) => void;
};

type VehicleRemarkState = {
    lastRemark: string;
    newRemark: string;
    useLastRemark: boolean;
};

type VehicleRemarksMap = Record<string, VehicleRemarkState>;

type PersistedFormData = {
    openingTime: string | null; // ISO string
    vehicleRemarks: VehicleRemarksMap;
};

const getStorageKey = (userId: string) => {
    const dateStr = new Date().toISOString().split("T")[0];
    return `morningUpdate_${userId}_${dateStr}`;
};

const formatDateHeading = (d: Date) => d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
});

const MorningUpdateForm: React.FC<Props> = ({ isOpen, onClose, user, onSuccess }) => {
    const [vehicles, setVehicles] = useState<DetailedVehicleData[]>([]);
    const [vehicleRemarks, setVehicleRemarks] = useState<VehicleRemarksMap>({});
    const [openingTime, setOpeningTime] = useState<Date | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);

    const [showMobileUpdateDialog, setShowMobileUpdateDialog] = useState<boolean>(false);
    const [selectedDriver, setSelectedDriver] = useState<{
        id: string;
        name: string;
        vehicleNo: string;
    } | null>(null);
    const [newMobileNumber, setNewMobileNumber] = useState<string>("");

    const storageKey = useMemo(() => user?._id ? getStorageKey(user._id) : "", [user?._id]);

    useEffect(() => {
        if (!user?._id) return; // Only check for user, not isOpen

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                // Load persisted form data (openingTime + remarks)
                const saved = await loadFormData<PersistedFormData>(storageKey);

                // Fetch vehicles
                const isAdmin = Boolean(user?.Division?.includes("Admin"));
                const data = await fetchUserVehicles(user._id, isAdmin);
                if (cancelled) return;
                setVehicles(data);

                // Build initial remarks map
                const initialRemarks: VehicleRemarksMap = {};
                for (const v of data) {
                    const vehicleNo = v?.vehicle?.VehicleNo;
                    if (!vehicleNo) continue;

                    const lastRemark =
                        v?.lastStatusUpdate?.comment ||
                        (Array.isArray(v?.latestTrip?.statusUpdate) && v.latestTrip.statusUpdate.length > 0
                            ? v.latestTrip.statusUpdate[v.latestTrip.statusUpdate.length - 1]?.comment || ""
                            : "") ||
                        v?.lastDriverLog?.leaving?.remark ||
                        "";

                    const savedState = saved?.vehicleRemarks?.[vehicleNo];
                    initialRemarks[vehicleNo] = {
                        lastRemark: lastRemark || "",
                        newRemark: savedState?.newRemark ?? "",
                        useLastRemark: savedState?.useLastRemark ?? false,
                    };
                }
                setVehicleRemarks(initialRemarks);

                // Restore or capture openingTime from localforage
                if (saved?.openingTime) {
                    setOpeningTime(new Date(saved.openingTime));
                } else {
                    const firstOpenISO = new Date().toISOString();
                    setOpeningTime(new Date(firstOpenISO));
                    try {
                        await saveFormData(storageKey, {
                            openingTime: firstOpenISO,
                            vehicleRemarks: initialRemarks,
                        } as PersistedFormData);
                    } catch (e) {
                        console.warn("Failed to persist initial opening time", e);
                    }
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to initialize morning update", { description: String(err) });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id]);

    useEffect(() => {
        if (!isOpen || !user?._id) return;

        (async () => {
            try {
                const isAdmin = Boolean(user?.Division?.includes("Admin"));
                const data = await fetchUserVehicles(user._id, isAdmin);
                setVehicles(data);
            } catch (err) {
                console.error("Failed to refresh vehicles:", err);
            }
        })();
    }, [isOpen, user?._id]);

    useEffect(() => {
        if (!storageKey) return;
        const persist: PersistedFormData = { openingTime: openingTime ? openingTime.toISOString() : null, vehicleRemarks };
        (async () => {
            try {
                await saveFormData(storageKey, persist);
            } catch (e) {
                console.warn("Failed to persist morning update form", e);
            }
        })();
    }, [vehicleRemarks, openingTime, storageKey]);

    const resetMobileDialog = () => {
        setShowMobileUpdateDialog(false);
        setSelectedDriver(null);
        setNewMobileNumber("");
    };

    const onClickUpdateMobile = (driverId: string, name: string, vehicleNo: string) => {
        setSelectedDriver({ id: driverId, name, vehicleNo });
        setShowMobileUpdateDialog(true);
    };

    const confirmUpdateMobile = async () => {
        if (!selectedDriver) return;
        const mobile = newMobileNumber.trim();
        if (!/^\d{10}$/.test(mobile)) {
            toast.error("Invalid mobile number", { description: "Enter a 10-digit mobile number" });
            return;
        }
        try {
            await updateDriverMobile(selectedDriver.name, mobile);
            toast.success("Driver mobile updated", { description: `${selectedDriver.name} - ${mobile}` });
            // Refresh vehicles to reflect new mobile if needed
            if (user?._id) {
                const isAdmin = Boolean(user?.Division?.includes("Admin"));
                const data = await fetchUserVehicles(user._id, isAdmin);
                setVehicles(data);
            }
            resetMobileDialog();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update mobile", { description: String(err) });
        }
    };

    const validateForm = () => {
        const entries = Object.entries(vehicleRemarks);
        const hasAnyRemark = entries.some(([vehicleNo, state]) => {
            if (!state) return false;
            if (state.useLastRemark) return Boolean(state.lastRemark?.trim());
            return Boolean(state.newRemark?.trim());
        });
        if (!hasAnyRemark) {
            return { isValid: false, error: "Add at least one remark to submit." };
        }
        if (!user?._id || !user?.name) {
            return { isValid: false, error: "User information is missing." };
        }
        return { isValid: true } as const;
    };

    const handleSubmit = async () => {
        const validation = validateForm();
        if (!validation.isValid) {
            toast.error("Validation failed", { description: validation.error });
            return;
        }

        try {
            setSubmitting(true);
            // Build report
            const report = Object.entries(vehicleRemarks)
                .map(([vehicleNo, state]) => {
                    const remark = state.useLastRemark ? state.lastRemark?.trim() : state.newRemark?.trim();
                    return remark ? { vehicleNo, remark } : null;
                })
                .filter(Boolean) as { vehicleNo: string; remark: string }[];

            if (report.length === 0) {
                toast.error("No remarks to submit");
                return;
            }

            const payload = {
                user: { _id: user!._id, name: user!.name },
                openingTime: (openingTime ?? new Date()).toISOString(),
                report,
                closingTime: new Date().toISOString(),
            };

            const res = await fetch(`${BASE_URL}/morning-update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const message = data?.error || data?.message || `Request failed (${res.status})`;
                toast.error("Submission failed", { description: message });
                return;
            }

            // Build enriched report data for parent/report view
            const formattedDate = new Date().toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            const formattedOpening = (openingTime ?? new Date()).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const formattedClosing = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const vehiclesReport = (payload.report as { vehicleNo: string; remark: string }[]).map(({ vehicleNo, remark }) => {
                const vmatch = vehicles.find(v => v.vehicle?.VehicleNo === vehicleNo);
                const route = `${vmatch?.latestTrip?.StartFrom || 'N/A'} → ${vmatch?.latestTrip?.EndTo || 'N/A'}`;
                return { vehicleNo, route, remark };
            });

            const enriched = {
                user: { name: user!.name },
                date: formattedDate,
                openingTime: formattedOpening,
                closingTime: formattedClosing,
                vehicles: vehiclesReport,
            };

            // Success: clear stored data (openingTime + remarks via localforage)
            if (storageKey) await clearFormData(storageKey);
            setOpeningTime(null);
            toast.success("Morning update submitted successfully");
            onSuccess?.(enriched);
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Unexpected error", { description: String(err) });
        } finally {
            setSubmitting(false);
        }
    };

    const currentDateHeading = useMemo(() => formatDateHeading(new Date()), []);

    const anyVehicles = vehicles && vehicles.length > 0;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>
                            Morning Update - {currentDateHeading}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription />

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: "60svh" }}>
                        {loading && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicles…
                            </div>
                        )}

                        {!loading && !anyVehicles && (
                            <div className="text-sm text-muted-foreground">No vehicles found.</div>
                        )}

                        {!loading && anyVehicles && vehicles.filter(vehicle => vehicle?.latestTrip.LoadStatus === 0 && (!vehicle?.latestTrip?.ReportingDate || vehicle?.latestTrip?.ReportingDate == null)).map((v) => {
                            const vehicleNo = v?.vehicle?.VehicleNo;
                            if (!vehicleNo) return null;

                            const state = vehicleRemarks[vehicleNo] || { lastRemark: "", newRemark: "", useLastRemark: false };

                            const anyV: any = v as any;
                            const driverId = (v?.driver?._id ?? "") as string;
                            const driverName = v?.driver?.name || v?.vehicle?.tripDetails?.driver || "—";
                            const driverMobile = v?.driver?.mobile || anyV?.driver?.mobileNo || anyV?.driver?.mobile_number || anyV?.driver?.phone || anyV?.driver?.contactNo || anyV?.driver?.contact || null;

                            return (
                                <Card key={v._id ?? vehicleNo}>
                                    <CardHeader className="py-3">
                                        <div className="flex flex-col sm:flex-row md:items-center justify-between gap-3">
                                            <div>
                                                <div className="font-semibold text-base">{vehicleNo}</div>
                                                <div className="text-xs text-muted-foreground">Route: {v.latestTrip.StartFrom} - {v.latestTrip.EndTo}</div>
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-sm">
                                                    <div className="font-medium">{driverName}</div>
                                                    {driverMobile && (
                                                        <div className="text-xs text-muted-foreground">{String(driverMobile)}</div>
                                                    )}
                                                </div>
                                                {driverMobile ? (
                                                    <div className="flex flex-col gap-1">
                                                        <a
                                                            href={`tel:${driverMobile}`}
                                                            aria-label={`Call ${driverName}`}
                                                        ><Button variant="default" className="w-full">
                                                                <Phone size={16} />
                                                            </Button>
                                                        </a>
                                                        <span className="text-xs text-blue-500 cursor-pointer" onClick={() => onClickUpdateMobile(driverId, driverName, vehicleNo)}>Edit mobile</span>
                                                    </div>
                                                ) : driverId ? (
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        className="inline-flex items-center gap-1"
                                                        onClick={() => onClickUpdateMobile(driverId, driverName, vehicleNo)}
                                                    >
                                                        <Edit size={14} /> Add Mobile no
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardDescription />
                                    <CardContent className="pt-0">
                                        <div className="text-xs text-muted-foreground mb-2">
                                            <span className="font-medium">Last Status:</span> {state.lastRemark || "—"}
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <Checkbox
                                                id={`use-last-${vehicleNo}`}
                                                checked={state.useLastRemark}
                                                onCheckedChange={(checked) => {
                                                    setVehicleRemarks((prev) => ({
                                                        ...prev,
                                                        [vehicleNo]: { ...state, useLastRemark: Boolean(checked) },
                                                    }));
                                                }}
                                            />
                                            <Label htmlFor={`use-last-${vehicleNo}`}>Use same remark</Label>
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor={`remark-${vehicleNo}`}>New Remark</Label>
                                            <Textarea
                                                id={`remark-${vehicleNo}`}
                                                placeholder={`Enter morning update remark for ${vehicleNo}`}
                                                value={state.useLastRemark ? (state.lastRemark || "") : state.newRemark}
                                                disabled={state.useLastRemark}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setVehicleRemarks((prev) => ({
                                                        ...prev,
                                                        [vehicleNo]: { ...state, newRemark: val },
                                                    }));
                                                }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <DialogFooter className="mt-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                        <Button type="button" onClick={handleSubmit} disabled={submitting || !anyVehicles}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showMobileUpdateDialog} onOpenChange={(o) => { if (!o) resetMobileDialog(); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Driver Mobile</DialogTitle>
                        <DialogDescription>
                            {selectedDriver ? (
                                <span>
                                    Enter mobile number for <span className="font-medium">{selectedDriver.name}</span> ({selectedDriver.vehicleNo})
                                </span>
                            ) : (
                                "Enter new mobile number"
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="newMobile">Mobile Number</Label>
                        <Input
                            id="newMobile"
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]{10}"
                            placeholder="10-digit mobile number"
                            value={newMobileNumber}
                            onChange={(e) => setNewMobileNumber(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={resetMobileDialog}>Cancel</Button>
                        <Button type="button" onClick={confirmUpdateMobile}>Update</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default MorningUpdateForm;
