"use client";

import React from "react";
import Combobox, { ComboboxOption } from "@/components/Combobox";
import Link from "next/link";
import { BASE_URL } from "@/lib/api";
import { TankersTrip, TransAppUser } from "@/types";
import { isAuthenticated } from "@/lib/auth";

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

    // Initialize from search param if provided
    React.useEffect(() => {
        if (isAuthenticated()) {
            const storedUser: TransAppUser = JSON.parse(localStorage.getItem('adminUser')!);
            setUser(storedUser);
            setUserId(storedUser.userId);
        }
    }, []);

    const fetchUserVehicles = React.useCallback(async () => {
        if (!userId) {
            setError("userId is required");
            return;
        }
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
            <h1 className="text-2xl font-semibold">Trips ranking</h1>
            <div className="flex items-end gap-2 flex-wrap">
                <div className="flex flex-col">
                    <label className="text-sm text-gray-600">User ID</label>
                    <input
                        className="border rounded px-3 py-2 min-w-[320px]"
                        placeholder="Enter userId (or pass ?userId=... in URL)"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                    />
                </div>
                <button
                    className="border px-3 py-2 rounded bg-white hover:bg-gray-50"
                    onClick={fetchUserVehicles}
                    disabled={loadingVehicles || !userId}
                >
                    {loadingVehicles ? "Loading…" : "Load vehicles"}
                </button>
                <div className="flex-1" />
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

            {error ? <div className="text-red-600 text-sm">{error}</div> : null}

            {loadingTrips && <div>Loading trips…</div>}

            {!loadingTrips && selectedVehicle && Object.keys(grouped).length === 0 && (
                <div>No trips found for vehicle {selectedVehicle}</div>
            )}

            <div className="space-y-6">
                {Object.entries(grouped).map(([day, list]) => (
                    <div key={day} className="border rounded-md">
                        <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                            <div className="font-medium">{day} — {list.length} trip(s)</div>
                            <button
                                className="text-sm border px-2 py-1 rounded bg-white hover:bg-gray-100"
                                onClick={() => persistOrder(day)}
                            >
                                Save order
                            </button>
                        </div>
                        <ul className="divide-y" onDragOver={onDragOver}>
                            {list.map((t, idx) => (
                                <li
                                    key={t._id}
                                    draggable
                                    onDragStart={onDragStart(day, idx)}
                                    onDrop={onDrop(day, idx)}
                                    className="p-3 flex items-center gap-3 bg-white hover:bg-gray-50"
                                    title="Drag to reorder within this day"
                                >
                                    <span className="cursor-grab select-none text-gray-400">≡</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">
                                            {t.VehicleNo} — {t.StartFrom || "?"} → {t.EndTo || "?"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            Status: {t.LoadStatus === 1 ? "Loaded" : "Empty"}
                                            {typeof t.rankindex === "number" ? ` • rank ${t.rankindex}` : ""}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/trans-app/trip-update/${t._id}`}
                                            className="text-xs border px-2 py-1 rounded hover:bg-gray-100"
                                        >
                                            Update
                                        </Link>
                                        <button
                                            className="text-xs border px-2 py-1 rounded hover:bg-red-50 text-red-700 border-red-300"
                                            onClick={() => deleteTrip(t._id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
