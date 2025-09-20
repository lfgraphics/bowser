"use client";

import React from "react";
import Combobox, { ComboboxOption } from "@/components/Combobox";
import { BASE_URL } from "@/lib/api";
import { TankersTrip, TransAppUser } from "@/types";
import { isAuthenticated } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UpdateTripMenu from "@/components/transappComponents/UpdateTripMenu";
import { GripVertical } from "lucide-react";

type GroupedTrips = Record<string, TankersTrip[]>; // key = YYYY-MM-DD

function toDateKey(d?: string | Date) {
    if (!d) return "unknown";
    const date = new Date(d);
    // normalize to local day start, then format yyyy-mm-dd
    const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
}

export default function TripsRankingPage() {
    const [user, setUser] = React.useState<TransAppUser | null>(null);
    const [userId, setUserId] = React.useState<string>("");
    const [vehicleOptions, setVehicleOptions] = React.useState<ComboboxOption[]>([]);
    const [selectedVehicle, setSelectedVehicle] = React.useState<string>("");
    const [searchTerm, setSearchTerm] = React.useState<string>("");
    const [loadingVehicles, setLoadingVehicles] = React.useState(false);
    const [loadingTrips, setLoadingTrips] = React.useState(false);
    const [trips, setTrips] = React.useState<TankersTrip[]>([]);
    const [grouped, setGrouped] = React.useState<GroupedTrips>({});
    const [error, setError] = React.useState<string>("");

    // Confirmation dialog state
    const [confirmDay, setConfirmDay] = React.useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

    // Initialize from search param if provided
    React.useEffect(() => {
        if (isAuthenticated()) {
            const storedUser: TransAppUser = JSON.parse(localStorage.getItem('adminUser')!);
            setUser(storedUser);
            setUserId(storedUser._id);
        }
    }, []);

    // Auto-fetch vehicles once userId is available
    React.useEffect(() => {
        if (userId) {
            fetchUserVehicles();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const fetchUserVehicles = React.useCallback(async () => {
        if (!userId) return;
        setError("");
        setLoadingVehicles(true);
        try {
            const res = await fetch(`${BASE_URL}/trans-app/vehicles?userId=${encodeURIComponent(userId)}`);
            if (!res.ok) throw new Error(`Failed to fetch vehicles (${res.status})`);
            const vehicles: Array<string | { VehicleNo?: string; vehicleNo?: string }> = await res.json();
            const nos = vehicles.map((v: any) => v?.VehicleNo || v?.vehicleNo || v).filter(Boolean);
            setVehicleOptions(nos.map((n: string) => ({ label: n, value: n })));
        } catch (e: any) {
            setError(e?.message || "Failed to fetch vehicles");
        } finally {
            setLoadingVehicles(false);
        }
    }, [userId]);

    const fetchTrips = React.useCallback(async (vehicleNo: string) => {
        if (!vehicleNo) return;
        setLoadingTrips(true);
        setError("");
        try {
            const res = await fetch(`${BASE_URL}/trans-app/vehicles/get-all-trips/${encodeURIComponent(vehicleNo)}`);
            if (!res.ok) throw new Error(`Failed to fetch trips (${res.status})`);
            const data: TankersTrip[] = await res.json();
            setTrips(data);
        } catch (e: any) {
            setError(e?.message || "Failed to fetch trips");
        } finally {
            setLoadingTrips(false);
        }
    }, []);

    // group trips by day whenever trips change
    React.useEffect(() => {
        const g: GroupedTrips = {};
        for (const t of trips) {
            const key = toDateKey(t.StartDate);
            if (!g[key]) g[key] = [];
            g[key].push(t);
        }
        // sort within each group by rankindex asc (0 first) then fallback to StartDate asc
        Object.keys(g).forEach((k) => {
            g[k].sort((a, b) => {
                const ra = typeof a.rankindex === "number" ? a.rankindex : Number.MAX_SAFE_INTEGER;
                const rb = typeof b.rankindex === "number" ? b.rankindex : Number.MAX_SAFE_INTEGER;
                if (ra !== rb) return ra - rb;
                const da = a.StartDate ? new Date(a.StartDate).getTime() : 0;
                const db = b.StartDate ? new Date(b.StartDate).getTime() : 0;
                return da - db;
            });
        });
        setGrouped(g);
    }, [trips]);

    // Derive a human-readable trip status like VehicleManagement
    const computeTripStatus = React.useCallback((trip?: TankersTrip): string => {
        if (!trip) return "—";
        const isEmpty = Number(trip.LoadStatus) === 0;
        const hasReported = Boolean((trip as any).ReportingDate || trip.LoadTripDetail?.ReportDate || (trip as any).EmptyTripDetail?.ReportDate);
        const hasUnloaded = Boolean(trip.LoadTripDetail?.UnloadDate);
        if (hasUnloaded) return "Unloaded - Not Planned";
        if (hasReported) return isEmpty ? "Empty Reported" : "Loaded Reported";
        return isEmpty ? "Empty On Way" : "Loaded On Way";
    }, []);

    // Drag & drop state
    const dragItem = React.useRef<{ day: string; index: number } | null>(null);

    const onDragStart = (day: string, index: number) => () => {
        dragItem.current = { day, index };
    };
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };
    const onDrop = (day: string, index: number) => (e: React.DragEvent) => {
        e.preventDefault();
        const from = dragItem.current;
        dragItem.current = null;
        if (!from || from.day !== day) return; // only allow within-group reordering
        if (index === from.index) return;

        setGrouped((prev) => {
            const copy = { ...prev };
            const list = [...(copy[day] || [])];
            const [moved] = list.splice(from.index, 1);
            list.splice(index, 0, moved);
            // update local rankindex sequentially
            list.forEach((t, i) => (t.rankindex = i));
            copy[day] = list;
            // also reflect into flat trips array
            setTrips((old) => {
                const idsInDay = new Set(list.map((t) => t._id));
                return old.map((t) => (idsInDay.has(t._id) ? list.find((x) => x._id === t._id)! : t));
            });
            return copy;
        });
    };

    const persistOrder = async (day: string) => {
        const orderedTripIds = (grouped[day] || []).map((t) => t._id);
        try {
            const body: any = { orderedTripIds };
            if (/^\d{4}-\d{2}-\d{2}$/.test(day)) body.date = day;
            const res = await fetch(`${BASE_URL}/trans-app/vehicles/trips/reorder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("Failed to save order");
        } catch (e: any) {
            setError(e?.message || "Failed to save order");
        }
    };

    const deleteTrip = async (id: string) => {
        if (!id) return;
        try {
            const res = await fetch(`${BASE_URL}/trans-app/vehicles/trip/${encodeURIComponent(id)}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete trip");
            setTrips((prev) => prev.filter((t) => t._id !== id));
        } catch (e: any) {
            setError(e?.message || "Failed to delete trip");
        }
    };

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-2xl font-bold">Trips Ranking</h1>
            <div className="flex items-end gap-2 flex-wrap">
                <div className="min-w-[280px]">
                    <Combobox
                        options={vehicleOptions}
                        value={selectedVehicle}
                        onChange={(val) => {
                            setSelectedVehicle(val);
                            if (val) fetchTrips(val);
                        }}
                        placeholder={loadingVehicles ? "Loading vehicles…" : "Select vehicle…"}
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        width="w-[320px]"
                    />
                </div>
            </div>


            {error ? <div className="text-destructive-foreground text-sm mt-3">{error}</div> : null}

            {loadingTrips && <div className="mt-3 text-sm">Loading trips…</div>}

            {!loadingTrips && selectedVehicle && Object.keys(grouped).length === 0 && (
                <div className="mt-3 text-sm">No trips found for vehicle {selectedVehicle}</div>
            )}

            <div className="space-y-6 mt-4">
                {Object.entries(grouped).map(([day, list]) => (
                    <Card key={day}>
                        <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-medium">{day} — {list.length} trip(s)</CardTitle>
                                <AlertDialog open={confirmDay === day} onOpenChange={(open) => setConfirmDay(open ? day : null)}>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="outline" onClick={() => setConfirmDay(day)}>Save order</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Save new order?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will update the ranking for all trips on {day}. You can change it again later.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => { persistOrder(day); setConfirmDay(null); }}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-hidden">
                            <ul className="divide-y" onDragOver={onDragOver}>
                                {list.map((t, idx) => (
                                    <li
                                        key={t._id}
                                        draggable
                                        onDragStart={onDragStart(day, idx)}
                                        onDrop={onDrop(day, idx)}
                                        className="p-3 flex items-center gap-3 bg-background hover:bg-card"
                                        title="Drag to reorder within this day"
                                    >
                                        <GripVertical className="cursor-grab select-none" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">
                                                {t.VehicleNo} — {t.StartFrom || "?"} → {t.EndTo || "?"}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Status: {t.LoadStatus === 1 ? "Loaded" : "Empty"}
                                                {typeof t.rankindex === "number" ? ` • rank ${t.rankindex}` : ""}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UpdateTripMenu
                                                trip={t as any}
                                                vehicleNo={t.VehicleNo}
                                                user={user as any}
                                                statusLabel={computeTripStatus(t)}
                                            />
                                            <AlertDialog open={confirmDeleteId === t._id} onOpenChange={(open) => setConfirmDeleteId(open ? t._id : null)}>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(t._id)}>Delete</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the selected trip.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { deleteTrip(t._id); setConfirmDeleteId(null); }}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>

        </div>
    );
}
