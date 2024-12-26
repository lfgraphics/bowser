"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { capturePhoto } from "@/lib/cameraUtils";
import { BASE_URL } from "@/lib/api";
import { Bowser, LoadingOrder, OrderBowserResponse } from "@/types";
import Loading from "@/app/loading";

// -- Our localforage helpers
import {
    saveFormData,
    loadFormData,
    clearFormData
} from "@/lib/storage";

// A single object type for the entire page’s form state
interface LoadingSheetFormData {
    // Server-fetched data (optional to store, but we can store to restore if user refreshes)
    order: LoadingOrder | null;
    bowser: Bowser | null;

    // Form fields
    odoMeter: string | number;
    fuleingMachine: string;
    pumpReadingBefore: string | number;
    pumpReadingAfter: string | number;

    chamberwiseDipListBefore: { chamberId: string; levelHeight: string | number; qty: number }[];
    chamberwiseDipListAfter: { chamberId: string; levelHeight: string | number; qty: number }[];

    chamberwiseSealList: {
        chamberId: string;
        seals: { sealId: string; sealPhoto?: string }[];
    }[];

    pumpSlips: {
        chamberId: string;
        slips: { qty: string | number; slipPhoto: string }[];
    }[];
}

const STORAGE_KEY = "loadingSheetPageData"; // Unique key in localforage

export default function LoadingSheetPage() {
    const router = useRouter();
    const params = useParams(); // The [id] from the URL
    const orderId = params.id;

    // -----------------------------------------
    // Loading + Error
    // -----------------------------------------
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // -----------------------------------------
    // Server-Fetched Data
    // -----------------------------------------
    const [order, setOrder] = useState<LoadingOrder | null>(null);
    const [bowser, setBowser] = useState<Bowser | null>(null);

    // -----------------------------------------
    // Form Fields
    // -----------------------------------------
    const [odoMeter, setOdoMeter] = useState<string | number>("");
    const [fuleingMachine, setFuleingMachine] = useState("");
    const [pumpReadingBefore, setPumpReadingBefore] = useState<string | number>("");
    const [pumpReadingAfter, setPumpReadingAfter] = useState<string | number>("");

    // Chamberwise Dip BEFORE
    const [chamberwiseDipListBefore, setChamberwiseDipListBefore] = useState<
        { chamberId: string; levelHeight: string | number; qty: number }[]
    >([]);

    // Chamberwise Dip AFTER
    const [chamberwiseDipListAfter, setChamberwiseDipListAfter] = useState<
        { chamberId: string; levelHeight: string | number; qty: number }[]
    >([]);

    // Chamberwise Seal List
    const [chamberwiseSealList, setChamberwiseSealList] = useState<
        {
            chamberId: string;
            seals: { sealId: string; sealPhoto?: string }[];
        }[]
    >([]);

    // Pump Slips
    const [pumpSlips, setPumpSlips] = useState<
        {
            chamberId: string;
            slips: { qty: string | number; slipPhoto: string }[];
        }[]
    >([]);

    // -----------------------------------------
    // 1) On mount: load from IndexedDB if exists, then fetch server
    // -----------------------------------------
    useEffect(() => {
        let didCancel = false;

        (async function initPage() {
            try {
                // 1. Attempt to load from localforage
                const saved = await loadFormData<LoadingSheetFormData>(STORAGE_KEY);
                if (!didCancel && saved) {
                    // Rehydrate all fields
                    setOrder(saved.order);
                    setBowser(saved.bowser);

                    setOdoMeter(saved.odoMeter);
                    setFuleingMachine(saved.fuleingMachine);
                    setPumpReadingBefore(saved.pumpReadingBefore);
                    setPumpReadingAfter(saved.pumpReadingAfter);
                    setChamberwiseDipListBefore(saved.chamberwiseDipListBefore);
                    setChamberwiseDipListAfter(saved.chamberwiseDipListAfter);
                    setChamberwiseSealList(saved.chamberwiseSealList);
                    setPumpSlips(saved.pumpSlips);
                }

                // 2. Fetch the server data if we haven’t stored it or want a fresh version
                if (orderId && (!saved || !saved.order)) {
                    setLoading(true);
                    setError(null);

                    const res = await fetch(`${BASE_URL}/loading/orders/${orderId}`, {
                        method: "GET",
                    });
                    if (!res.ok) {
                        throw new Error(`Failed to fetch order. Status: ${res.status}`);
                    }
                    const data: OrderBowserResponse = await res.json();
                    const { order, bowser } = data;

                    // If user has no local data, or we want to override
                    if (!didCancel) {
                        setOrder(order);
                        setBowser(bowser);

                        // Initialize the states if not already set
                        if (bowser?.chambers?.length > 0 && (!saved || !saved.bowser)) {
                            setChamberwiseDipListBefore(
                                bowser.chambers.map((ch) => ({
                                    chamberId: ch.chamberId,
                                    levelHeight: "",
                                    qty: 0,
                                }))
                            );

                            setChamberwiseDipListAfter(
                                bowser.chambers.map((ch) => ({
                                    chamberId: ch.chamberId,
                                    levelHeight: "",
                                    qty: 0,
                                }))
                            );

                            setChamberwiseSealList(
                                bowser.chambers.map((ch) => ({
                                    chamberId: ch.chamberId,
                                    seals: [{ sealId: "", sealPhoto: "" }],
                                }))
                            );

                            setPumpSlips(
                                bowser.chambers.map((ch) => ({
                                    chamberId: ch.chamberId,
                                    slips: [{ qty: "", slipPhoto: "" }],
                                }))
                            );
                        }
                    }
                }
            } catch (err: any) {
                console.error("Error loading from localForage or fetching data:", err);
                if (!didCancel) setError(err.message || "Error loading data");
            } finally {
                if (!didCancel) setLoading(false);
            }
        })();

        return () => {
            didCancel = true;
        };
    }, [orderId]);

    // -----------------------------------------
    // 2) Continuously save to IndexedDB whenever relevant state changes
    // -----------------------------------------
    useEffect(() => {
        // We'll build one object with all the data
        const formData: LoadingSheetFormData = {
            order,
            bowser,
            odoMeter,
            fuleingMachine,
            pumpReadingBefore,
            pumpReadingAfter,
            chamberwiseDipListBefore,
            chamberwiseDipListAfter,
            chamberwiseSealList,
            pumpSlips,
        };
        saveFormData(STORAGE_KEY, formData).catch((err) => {
            console.error("Failed to save form data:", err);
        });
    }, [
        order,
        bowser,
        odoMeter,
        fuleingMachine,
        pumpReadingBefore,
        pumpReadingAfter,
        chamberwiseDipListBefore,
        chamberwiseDipListAfter,
        chamberwiseSealList,
        pumpSlips
    ]);

    // -----------------------------------------
    // 3) Handle Camera for Seals
    // -----------------------------------------
    async function handleSealPhoto(chamberIdx: number, sealIdx: number) {
        try {
            const base64 = await capturePhoto();
            setChamberwiseSealList((prev) => {
                const copy = [...prev];
                copy[chamberIdx].seals[sealIdx].sealPhoto = base64;
                return copy;
            });
        } catch (err) {
            console.error("Error capturing seal photo:", err);
        }
    }

    // -----------------------------------------
    // 4) Handle Camera for Slips
    // -----------------------------------------
    async function handleSlipPhoto(chamberIdx: number, slipIdx: number) {
        try {
            const base64 = await capturePhoto();
            setPumpSlips((prev) => {
                const copy = [...prev];
                copy[chamberIdx].slips[slipIdx].slipPhoto = base64;
                return copy;
            });
        } catch (err) {
            console.error("Error capturing slip photo:", err);
        }
    }

    // -----------------------------------------
    // 5) Handle Submit => POST
    // -----------------------------------------
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!order) {
            setError("No valid order data. Cannot submit.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // If you store the "loadingIncharge" in localStorage
            const storedUserJson = localStorage.getItem("adminUser");
            let loadingIncharge = { id: "dummyUserId", name: "Dummy Incharge" };
            if (storedUserJson) {
                const storedUser = JSON.parse(storedUserJson);
                loadingIncharge = {
                    id: storedUser.userId || "dummyUserId",
                    name: storedUser.name || "Dummy Incharge",
                };
            }

            // Prepare the payload
            const payload = {
                regNo: order.regNo,
                odoMeter: Number(odoMeter),
                fuleingMachine,
                pumpReadingBefore: pumpReadingBefore ? Number(pumpReadingBefore) : undefined,
                pumpReadingAfter: Number(pumpReadingAfter),

                chamberwiseDipListBefore: chamberwiseDipListBefore.map((dip) => ({
                    ...dip,
                    levelHeight: Number(dip.levelHeight),
                })),

                chamberwiseDipListAfter: chamberwiseDipListAfter.map((dip) => ({
                    ...dip,
                    levelHeight: Number(dip.levelHeight),
                })),

                chamberwiseSealList: chamberwiseSealList.flatMap((ch) =>
                    ch.seals.map((sealObj) => ({
                        chamberId: ch.chamberId,
                        sealId: sealObj.sealId,
                        sealPhoto: sealObj.sealPhoto,
                    }))
                ),

                pumpSlips: pumpSlips.flatMap((ch) =>
                    ch.slips.map((slip) => ({
                        chamberId: ch.chamberId,
                        qty: Number(slip.qty),
                        slipPhoto: slip.slipPhoto,
                    }))
                ),

                loadingIncharge,
                bccAuthorizedOfficer: {
                    orderId: order._id,
                    id: order.bccAuthorizedOfficer.id,
                    name: order.bccAuthorizedOfficer.name,
                },
            };

            const res = await fetch(`${BASE_URL}/loading/sheet`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData?.error || "Failed to create loading sheet.");
            }

            const createdSheet = await res.json();
            console.log("Created LoadingSheet:", createdSheet);

            // Clear the stored data after success
            await clearFormData(STORAGE_KEY);

            // Navigate away or show success
            router.push("/loading/orders");
        } catch (err: any) {
            console.error("Error creating loading sheet:", err);
            setError(err.message || "Error creating loading sheet.");
        } finally {
            setLoading(false);
        }
    }

    // -----------------------------------------
    // 6) Reset the Form => clear in-memory + IndexedDB
    // -----------------------------------------
    function resetForm() {
        setOrder(null);
        setBowser(null);

        setOdoMeter("");
        setFuleingMachine("");
        setPumpReadingBefore("");
        setPumpReadingAfter("");
        setChamberwiseDipListBefore([]);
        setChamberwiseDipListAfter([]);
        setChamberwiseSealList([]);
        setPumpSlips([]);

        // Also remove from localforage
        clearFormData(STORAGE_KEY).catch((err) => {
            console.error("Failed to clear form data:", err);
        });
    }

    // -----------------------------------------
    // 7) Rendering
    // -----------------------------------------
    // If still loading and we have no local data
    if (loading && !order && !bowser) {
        return <Loading />;
    }

    // If still loading but we do have data, you could show partial form, or a spinner overlay
    // if (loading) { ... optional ... }

    if (error) {
        return <p className="p-4 text-red-600">Error: {error}</p>;
    }

    // If we never got an order or bowser
    if (!order || !bowser) {
        return <p className="p-4">No data found.</p>;
    }

    return (
        <div className="mx-auto py-8 container">
            {loading && <Loading />}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Create Loading Sheet for: {order.regNo} (Order #{order._id})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Global Fields */}
                        <div className="p-2 border rounded">
                            <div className="flex flex-col mb-2">
                                <Label>Odometer</Label>
                                <Input
                                    type="number"
                                    value={odoMeter}
                                    onChange={(e) => setOdoMeter(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex flex-col mb-2">
                                <Label>Fueling Machine</Label>
                                <Input
                                    value={fuleingMachine}
                                    onChange={(e) => setFuleingMachine(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex flex-col mb-2">
                                <Label>Pump Reading (Before)</Label>
                                <Input
                                    type="number"
                                    value={pumpReadingBefore}
                                    onChange={(e) => setPumpReadingBefore(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col mb-2">
                                <Label>Pump Reading (After)</Label>
                                <Input
                                    type="number"
                                    value={pumpReadingAfter}
                                    onChange={(e) => setPumpReadingAfter(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Chamberwise Dip BEFORE */}
                        <div className="p-2 border rounded">
                            <h4 className="mb-2 font-semibold">Chamberwise Dip (Before)</h4>
                            {chamberwiseDipListBefore.map((dip, idx) => (
                                <div key={dip.chamberId} className="flex space-x-2 mb-2">
                                    <Label className="w-24">{dip.chamberId}</Label>
                                    <Input
                                        type="number"
                                        placeholder="Level Height"
                                        value={dip.levelHeight}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setChamberwiseDipListBefore((prev) => {
                                                const copy = [...prev];
                                                copy[idx] = {
                                                    ...copy[idx],
                                                    levelHeight: newVal,
                                                };
                                                return copy;
                                            });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Chamberwise Dip AFTER */}
                        <div className="p-2 border rounded">
                            <h4 className="mb-2 font-semibold">Chamberwise Dip (After)</h4>
                            {chamberwiseDipListAfter.map((dip, idx) => (
                                <div key={dip.chamberId} className="flex space-x-2 mb-2">
                                    <Label className="w-24">{dip.chamberId}</Label>
                                    <Input
                                        type="number"
                                        placeholder="Level Height"
                                        value={dip.levelHeight}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setChamberwiseDipListAfter((prev) => {
                                                const copy = [...prev];
                                                copy[idx] = {
                                                    ...copy[idx],
                                                    levelHeight: newVal,
                                                };
                                                return copy;
                                            });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Chamberwise Seal List */}
                        <div className="p-2 border rounded">
                            <h4 className="mb-2 font-semibold">Chamberwise Seal List</h4>
                            {chamberwiseSealList.map((ch, chamberIdx) => (
                                <div key={ch.chamberId} className="mb-4">
                                    <p className="font-semibold">{ch.chamberId}</p>
                                    {ch.seals.map((seal, sealIdx) => (
                                        <div key={sealIdx} className="flex space-x-2 mb-2">
                                            <Label className="w-16">Seal #{sealIdx + 1}</Label>
                                            <Input
                                                placeholder="Seal ID"
                                                value={seal.sealId}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setChamberwiseSealList((prev) => {
                                                        const copy = [...prev];
                                                        copy[chamberIdx] = {
                                                            ...copy[chamberIdx],
                                                            seals: copy[chamberIdx].seals.map((s, i) =>
                                                                i === sealIdx ? { ...s, sealId: newVal } : s
                                                            ),
                                                        };
                                                        return copy;
                                                    });
                                                }}
                                            />

                                            {seal.sealPhoto && (
                                                <img
                                                    src={seal.sealPhoto}
                                                    alt="Seal Photo"
                                                    className="border w-16 h-16"
                                                />
                                            )}

                                            <Button
                                                variant="outline"
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    await handleSealPhoto(chamberIdx, sealIdx);
                                                }}
                                            >
                                                {seal.sealPhoto ? "Retake Photo" : "Take Photo"}
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setChamberwiseSealList((prev) => {
                                                const copy = [...prev];
                                                copy[chamberIdx] = {
                                                    ...copy[chamberIdx],
                                                    seals: [
                                                        ...copy[chamberIdx].seals,
                                                        { sealId: "", sealPhoto: "" },
                                                    ],
                                                };
                                                return copy;
                                            });
                                        }}
                                    >
                                        + Add Seal
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Pump Slips */}
                        <div className="p-2 border rounded">
                            <h4 className="mb-2 font-semibold">Pump Slips</h4>
                            {pumpSlips.map((ch, chamberIdx) => (
                                <div key={ch.chamberId} className="mb-4">
                                    <p className="font-semibold">{ch.chamberId}</p>
                                    {ch.slips.map((slip, slipIdx) => (
                                        <div key={slipIdx} className="flex flex-col mb-2">
                                            <div className="flex space-x-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Qty"
                                                    value={slip.qty}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setPumpSlips((prev) => {
                                                            const copy = [...prev];
                                                            copy[chamberIdx] = {
                                                                ...copy[chamberIdx],
                                                                slips: copy[chamberIdx].slips.map((s, i) =>
                                                                    i === slipIdx ? { ...s, qty: newVal } : s
                                                                ),
                                                            };
                                                            return copy;
                                                        });
                                                    }}
                                                />

                                                {slip.slipPhoto && (
                                                    <img
                                                        src={slip.slipPhoto}
                                                        alt="Slip Photo"
                                                        className="border w-16 h-16"
                                                    />
                                                )}

                                                <Button
                                                    variant="outline"
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        await handleSlipPhoto(chamberIdx, slipIdx);
                                                    }}
                                                >
                                                    {slip.slipPhoto ? "Retake Photo" : "Take Photo"}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setPumpSlips((prev) => {
                                                const copy = [...prev];
                                                copy[chamberIdx] = {
                                                    ...copy[chamberIdx],
                                                    slips: [
                                                        ...copy[chamberIdx].slips,
                                                        { qty: "", slipPhoto: "" },
                                                    ],
                                                };
                                                return copy;
                                            });
                                        }}
                                    >
                                        + Add Slip
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Error Display */}
                        {error && <p className="text-red-600">{error}</p>}

                        <div className="flex gap-4">
                            {/* Reset */}
                            <Button variant="outline" onClick={(e) => { e.preventDefault(); resetForm(); }} disabled={loading}>
                                {loading ? "Submitting..." : "Reset"}
                            </Button>

                            {/* Submit */}
                            <Button type="submit" disabled={loading}>
                                {loading ? "Submitting..." : "Submit"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
