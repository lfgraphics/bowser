"use client"

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
import Link from "next/link";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    user: TransAppUser | undefined;
    onSuccess?: (reportData: {
        user: { name: string },
        date: string,
        openingTime: string,
        closingTime: string,
        vehicles: Array<{
            vehicleNo: string,
            remark: string,
            location: string,
            plannedFor: string,
            unloadedAt: string,
            driverName: string,
            driverPhone?: string,
            isReported: boolean
        }>
    }) => void;
};

type VehicleRemarkState = {
    lastRemark: string;
    newRemark: string;
    useLastRemark: boolean;
    location: string;
    isReported: boolean;
};

type VehicleRemarksMap = Record<string, VehicleRemarkState>;

type PersistedFormData = {
    openingTime: string | null; // ISO string
    vehicleRemarks: VehicleRemarksMap;
    activityLogs: ActivityLog[];
};

type ActivityLog = {
    timestamp: string; // ISO string
    type: string;
    details?: Record<string, any>;
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
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

    const [showMobileUpdateDialog, setShowMobileUpdateDialog] = useState<boolean>(false);
    const [selectedDriver, setSelectedDriver] = useState<{
        id: string;
        name: string;
        vehicleNo: string;
    } | null>(null);
    const [newMobileNumber, setNewMobileNumber] = useState<string>("");
    const remarkTimersRef = useRef<Record<string, number | undefined>>({});

    const storageKey = useMemo(() => user?._id ? getStorageKey(user._id) : "", [user?._id]);

    const logActivity = useCallback((type: string, details?: Record<string, any>) => {
        try {
            const entry: ActivityLog = { timestamp: new Date().toISOString(), type, details };
            setActivityLogs((prev) => [...prev, entry]);
        } catch (e) {
            console.warn('Failed to log activity', e);
        }
    }, []);

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
                        (Array.isArray(v?.latestTrip?.statusUpdate) && v?.latestTrip?.statusUpdate.length > 0
                            ? v?.latestTrip?.statusUpdate[v?.latestTrip?.statusUpdate.length - 1]?.comment || ""
                            : "") ||
                        v?.lastDriverLog?.leaving?.remark ||
                        "";

                    const savedState = saved?.vehicleRemarks?.[vehicleNo];
                    initialRemarks[vehicleNo] = {
                        lastRemark: lastRemark || "",
                        newRemark: savedState?.newRemark ?? "",
                        useLastRemark: savedState?.useLastRemark ?? false,
                        location: savedState?.location ?? "",
                        isReported: savedState?.isReported ?? false,
                    };
                }
                setVehicleRemarks(initialRemarks);

                // Restore or capture openingTime from localforage
                if (saved?.openingTime) {
                    setOpeningTime(new Date(saved.openingTime));
                    // Restore activity logs if present
                    if (Array.isArray((saved as any)?.activityLogs)) {
                        setActivityLogs((saved as any).activityLogs as ActivityLog[]);
                    } else {
                        setActivityLogs([]);
                    }
                } else {
                    const firstOpenISO = new Date().toISOString();
                    setOpeningTime(new Date(firstOpenISO));
                    try {
                        await saveFormData(storageKey, {
                            openingTime: firstOpenISO,
                            vehicleRemarks: initialRemarks,
                            activityLogs: [] as ActivityLog[],
                        } as PersistedFormData);
                    } catch (e) {
                        console.warn("Failed to persist initial opening time", e);
                    }
                    // New session -> log form opened
                    if (user?._id) {
                        logActivity('form_opened', { userId: user._id, userName: user.name });
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
    }, [user?._id, storageKey, logActivity]);

    useEffect(() => {
        console.log("current vehicles:", vehicles.length);
    }, [vehicles])

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

        // Debounce persistence to prevent excessive saves
        const timeoutId = setTimeout(async () => {
            const persist: PersistedFormData & { activityLogs: ActivityLog[] } = {
                openingTime: openingTime ? openingTime.toISOString() : null,
                vehicleRemarks,
                activityLogs,
            };
            try {
                await saveFormData(storageKey, persist);
            } catch (e) {
                console.warn("Failed to persist morning update form", e);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [vehicleRemarks, openingTime, activityLogs, storageKey]);

    // Focus/blur logging while dialog open
    useEffect(() => {
        if (!isOpen) return;

        const onFocus = () => logActivity('came_online', { at: new Date().toISOString() });
        const onBlur = () => logActivity('went_offline', { at: new Date().toISOString() });

        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);

        // Ensure we log when dialog opens and page is already focused
        if (document.hasFocus()) onFocus();

        // Handle tab visibility and bfcache restores
        const onVisibility = () => (document.visibilityState === 'visible' ? onFocus() : onBlur());
        document.addEventListener('visibilitychange', onVisibility);

        const onPageShow = () => onFocus();
        const onPageHide = () => onBlur();
        window.addEventListener('pageshow', onPageShow);
        window.addEventListener('pagehide', onPageHide);

        return () => {
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pageshow', onPageShow);
            window.removeEventListener('pagehide', onPageHide);
        };
    }, [isOpen, logActivity]);

    useLayoutEffect(() => {
        if (!isOpen) return;
        return () => {
            logActivity('went_offline', { at: new Date().toISOString() });
        }
    }, [logActivity]);

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
            await updateDriverMobile(selectedDriver.id, mobile);
            toast.success("Driver mobile updated", { description: `${selectedDriver.name} - ${mobile}` });
            // Log activity with vehicle number
            logActivity('driver_mobile_updated', {
                vehicleNo: selectedDriver.vehicleNo,
                driverId: selectedDriver.id,
                driverName: selectedDriver.name,
                newMobile: mobile,
            });
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
        // Only validate vehicles that are currently shown in the UI (filteredVehicles)
        const entries = Object.entries(vehicleRemarks).filter(([vehicleNo]) =>
            vehicles.filter(vehicle => vehicle?.latestTrip?.LoadStatus === 0 && (!vehicle?.latestTrip?.ReportingDate || vehicle?.latestTrip?.ReportingDate == null))?.map(v => v?.vehicle?.VehicleNo).includes(vehicleNo)
        );

        // Check validation rules: remark required only when not reported, location always required
        const incompleteVehicles = entries.filter(([vehicleNo, state]) => {
            if (!state) return true;

            // Location is always required
            const hasLocation = Boolean(state.location?.trim());
            if (!hasLocation) return true;

            // Remark is only required when not reported
            if (!state.isReported) {
                const hasRemark = state.useLastRemark ? Boolean(state.lastRemark?.trim()) : Boolean(state.newRemark?.trim());
                if (!hasRemark) return true;
            }

            return false;
        });

        if (incompleteVehicles?.length > 0) {
            const vehicleNos = incompleteVehicles?.map(([vehicleNo]) => vehicleNo).join(', ');
            const missingFields = incompleteVehicles?.map(([vehicleNo, state]) => {
                const missing = [];
                if (!Boolean(state?.location?.trim())) missing.push('location');
                if (!state?.isReported) {
                    const hasRemark = state?.useLastRemark ? Boolean(state?.lastRemark?.trim()) : Boolean(state?.newRemark?.trim());
                    if (!hasRemark) missing.push('remark');
                }
                return `${vehicleNo} (${missing.join(', ')})`;
            }).join(', ');
            return { isValid: false, error: `Please provide missing fields for: ${missingFields}` };
        }

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
            // Build report with trip and driver IDs - only include filtered vehicles
            const filteredVehicleNos = vehicles.filter(vehicle => vehicle?.latestTrip?.LoadStatus === 0 && (!vehicle?.latestTrip?.ReportingDate || vehicle?.latestTrip?.ReportingDate == null))?.map(v => v?.vehicle?.VehicleNo).filter(Boolean);
            const report = Object.entries(vehicleRemarks)
                .filter(([vehicleNo]) => filteredVehicleNos.includes(vehicleNo))
                .map(([vehicleNo, state]) => {
                    const location = state.location?.trim();
                    if (!location) return null;

                    // For reported vehicles, remark is optional; for others, it's required
                    const remark = state.useLastRemark ? state.lastRemark?.trim() : state.newRemark?.trim();
                    if (!state.isReported && !remark) return null;

                    const vehicleData = vehicles?.find(v => v?.vehicle?.VehicleNo === vehicleNo);

                    return {
                        vehicleNo,
                        remark: remark || "", // Allow empty remark for reported vehicles
                        location,
                        trip: vehicleData?.latestTrip?._id || null,
                        driver: vehicleData?.driver?._id || null
                    };
                })
                .filter(Boolean) as Array<{
                    vehicleNo: string;
                    remark: string;
                    location: string;
                    trip: string | null;
                    driver: string | null;
                }>;

            if (report.length === 0) {
                toast.error("No vehicles to submit");
                return;
            }

            // Compose submission log inline to ensure it's included in payload
            const submissionLog: ActivityLog = {
                timestamp: new Date().toISOString(),
                type: 'form_submitted',
                details: {
                    reportCount: report.length,
                    totalActivities: activityLogs.length + 1,
                    vehiclesSubmitted: report.map(r => r.vehicleNo)
                },
            };
            const nextLogs = [...activityLogs, submissionLog];
            setActivityLogs(nextLogs);

            const payload = {
                user: { _id: user!._id, name: user!.name },
                openingTime: (openingTime ?? new Date()).toISOString(),
                report,
                closingTime: new Date().toISOString(),
                activityLogs: nextLogs,
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
            const vehiclesReport = report.map(({ vehicleNo, remark, location }) => {
                const vmatch = vehicles?.find(v => v?.vehicle?.VehicleNo === vehicleNo);
                const state = vehicleRemarks[vehicleNo];
                const plannedFor = vmatch?.latestTrip?.EndTo || 'N/A';
                const unloadedAt = vmatch?.latestTrip?.StartFrom || 'N/A';
                const driverName = vmatch?.driver?.name || vmatch?.vehicle?.tripDetails?.driver || 'N/A';
                const driverPhone = vmatch?.driver?.mobile || undefined;
                const isReported = state?.isReported || false;
                const currentlyAt = location || 'N/A';

                return {
                    vehicleNo,
                    remark,
                    location: currentlyAt,
                    plannedFor,
                    unloadedAt,
                    driverName,
                    driverPhone,
                    isReported: isReported || (currentlyAt === plannedFor)
                };
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
            setActivityLogs([]);
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

    const currentDateHeading = useMemo(() => {
        const today = new Date();
        return formatDateHeading(today);
    }, []);

    const anyVehicles = vehicles && vehicles?.length > 0;

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

                        {!loading && anyVehicles && vehicles.filter(vehicle => vehicle?.latestTrip?.LoadStatus === 0 && (!vehicle?.latestTrip?.ReportingDate || vehicle?.latestTrip?.ReportingDate == null))?.map((v) => {
                            const vehicleNo = v?.vehicle?.VehicleNo;
                            if (!vehicleNo) return null;

                            const state = vehicleRemarks[vehicleNo] || { lastRemark: "", newRemark: "", useLastRemark: false };

                            const anyV: any = v as any;
                            const driverId = (v?.driver?._id ?? "") as string;
                            const driverName = v?.driver?.name || v?.vehicle?.tripDetails?.driver || "—";
                            const driverMobile = v?.driver?.mobile || anyV?.driver?.mobileNo || anyV?.driver?.mobile_number || anyV?.driver?.phone || anyV?.driver?.contactNo || anyV?.driver?.contact || null;

                            return (
                                <Card key={v?._id ?? vehicleNo}>
                                    <CardHeader className="py-3">
                                        <div className="flex flex-col sm:flex-row md:items-center justify-between gap-3">
                                            <div>
                                                <div className="font-semibold text-base">{vehicleNo}</div>
                                                <div className="text-xs text-muted-foreground">Route: {v?.latestTrip?.StartFrom} → {v?.latestTrip?.EndTo.split(':')[1] || v?.latestTrip?.EndTo}</div>
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
                                                        <Link
                                                            href={`tel:${driverMobile}`}
                                                            aria-label={`Call ${driverName}`}
                                                            onClick={() => logActivity('driver_called', { vehicleNo, driverName, driverMobile })}
                                                        ><Button variant="default" className="w-full">
                                                                <Phone size={16} />
                                                            </Button>
                                                        </Link>
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

                                        {/* Location Field */}
                                        <div className="space-y-1 mb-3">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor={`location-${vehicleNo}`}>Current Location</Label>
                                                <Button
                                                    type="button"
                                                    variant={state.isReported ? "default" : "outline"}
                                                    size="sm"
                                                    className="text-xs px-3 py-1 h-7"
                                                    onClick={() => {
                                                        const newReported = !state.isReported;
                                                        let newLocation: string;

                                                        if (newReported) {
                                                            // When marking as reported, set to planned destination
                                                            newLocation = v?.latestTrip?.EndTo || "";
                                                        } else {
                                                            // When unmarking as reported, clear the location so user can enter manually
                                                            newLocation = "";
                                                        }

                                                        setVehicleRemarks((prev) => ({
                                                            ...prev,
                                                            [vehicleNo]: {
                                                                ...state,
                                                                isReported: newReported,
                                                                location: newLocation
                                                            },
                                                        }));
                                                        logActivity('reported_toggled', {
                                                            vehicleNo,
                                                            isReported: newReported,
                                                            location: newLocation
                                                        });
                                                    }}
                                                >
                                                    {state.isReported ? "Reported ✓" : "Reported"}
                                                </Button>
                                            </div>
                                            <Input
                                                id={`location-${vehicleNo}`}
                                                placeholder="Enter current location"
                                                value={state.location.split(':')[1] || state.location}
                                                readOnly={state.isReported}
                                                className={`${!state.location?.trim() ? "border-destructive bg-destructive/10" : ""} ${state.isReported ? "bg-muted" : ""}`}
                                                onChange={(e) => {
                                                    setVehicleRemarks((prev) => ({
                                                        ...prev,
                                                        [vehicleNo]: { ...state, location: e.target.value },
                                                    }));
                                                }}
                                            />
                                            {state.isReported && (
                                                <div className="text-xs text-muted-foreground">
                                                    Location set to planned destination: {v?.latestTrip?.EndTo.split(':')[1] || v?.latestTrip?.EndTo}
                                                </div>
                                            )}
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
                                                    logActivity('use_last_remark_toggled', {
                                                        vehicleNo,
                                                        checked: Boolean(checked),
                                                        lastRemark: state.lastRemark
                                                    });
                                                }}
                                            />
                                            <Label htmlFor={`use-last-${vehicleNo}`}>Use same remark</Label>
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor={`remark-${vehicleNo}`}>
                                                Remark {!state.isReported && "*"}
                                                {state.isReported && <span className="text-xs text-muted-foreground ml-1">(optional when reported)</span>}
                                            </Label>
                                            <Textarea
                                                id={`remark-${vehicleNo}`}
                                                placeholder={`Enter morning update remark for ${vehicleNo}`}
                                                value={state.useLastRemark ? (state.lastRemark || "") : state.newRemark}
                                                disabled={state.useLastRemark}
                                                className={`${!state.isReported &&
                                                    ((!state.useLastRemark && !state.newRemark?.trim()) || (state.useLastRemark && !state.lastRemark?.trim()))
                                                    ? "border-destructive bg-destructive/10" : ""
                                                    }`}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setVehicleRemarks((prev) => ({
                                                        ...prev,
                                                        [vehicleNo]: { ...state, newRemark: val },
                                                    }));
                                                    // Clear existing timer for this vehicle
                                                    if (remarkTimersRef.current[vehicleNo]) {
                                                        clearTimeout(remarkTimersRef.current[vehicleNo]);
                                                        delete remarkTimersRef.current[vehicleNo];
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    const val = e.target.value.trim();
                                                    // Only log if there's actual content
                                                    if (val && val !== state.newRemark.trim()) {
                                                        logActivity('remark_updated', {
                                                            vehicleNo,
                                                            newValue: val,
                                                            previousValue: state.newRemark.trim()
                                                        });
                                                    }
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
