"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { capturePhoto } from "@/lib/cameraUtils"; // <-- import the function here
import { BASE_URL } from "@/lib/api";
import { Bowser, LoadingOrder, OrderBowserResponse } from "@/types";
import Loading from "@/app/loading";

export default function LoadingSheetPage() {
    const router = useRouter();
    const params = useParams(); // The [id] from the URL
    const orderId = params.id;

    // Data from /orders/:id
    const [order, setOrder] = useState<LoadingOrder | null>(null);
    const [bowser, setBowser] = useState<Bowser | null>(null);

    // UI states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // LoadingSheet schema fields (global)
    const [odoMeter, setOdoMeter] = useState<number | string>("");
    const [fuleingMachine, setFuleingMachine] = useState("");
    const [pumpReadingBefore, setPumpReadingBefore] = useState<number | string>("");
    const [pumpReadingAfter, setPumpReadingAfter] = useState<number | string>("");

    // Chamberwise Dip BEFORE
    const [chamberwiseDipListBefore, setChamberwiseDipListBefore] = useState<
        { chamberId: string; levelHeight: number | string; qty: number }[]
    >([]);

    // Chamberwise Dip AFTER
    const [chamberwiseDipListAfter, setChamberwiseDipListAfter] = useState<
        { chamberId: string; levelHeight: number | string; qty: number }[]
    >([]);

    // Chamberwise Seal List (including photo if needed)
    const [chamberwiseSealList, setChamberwiseSealList] = useState<
        {
            chamberId: string;
            seals: {
                sealId: string;
                sealPhoto?: string; // added if you want to store a photo
            }[];
        }[]
    >([]);

    // Pump Slips (multiple slips per chamber)
    const [pumpSlips, setPumpSlips] = useState<
        {
            chamberId: string;
            slips: { qty: string | number; slipPhoto: string }[];
        }[]
    >([]);

    // ----------------------------------
    // 1) Fetch /orders/:id => { order, bowser }
    // ----------------------------------
    useEffect(() => {
        if (!orderId) return;
        async function fetchData() {
            try {
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

                setOrder(order);
                setBowser(bowser);

                // Initialize the chamberwise states
                if (bowser?.chambers?.length > 0) {
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

                    // Seal list: default 1 seal per chamber
                    setChamberwiseSealList(
                        bowser.chambers.map((ch) => ({
                            chamberId: ch.chamberId,
                            // if you want a photo, add `sealPhoto: ""`
                            seals: [{ sealId: "", sealPhoto: "" }],
                        }))
                    );

                    // Pump slips: default 1 slip per chamber
                    setPumpSlips(
                        bowser.chambers.map((ch) => ({
                            chamberId: ch.chamberId,
                            slips: [{ qty: "", slipPhoto: "" }],
                        }))
                    );
                }
            } catch (err: any) {
                setError(err.message ?? "Error fetching data");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [orderId]);

    // ----------------------------------
    // 2) Handle "Take Photo" for a Seal
    // ----------------------------------
    async function handleSealPhoto(chamberIdx: number, sealIdx: number) {
        try {
            const base64 = await capturePhoto();
            // Store the photo in the seal
            setChamberwiseSealList((prev) => {
                const copy = [...prev];
                copy[chamberIdx].seals[sealIdx].sealPhoto = base64;
                return copy;
            });
        } catch (err) {
            console.error("Error capturing seal photo:", err);
        }
    }

    // ----------------------------------
    // 3) Handle "Take Photo" for a Slip
    // ----------------------------------
    async function handleSlipPhoto(chamberIdx: number, slipIdx: number) {
        try {
            const base64 = await capturePhoto();
            // Store the photo in the slip
            setPumpSlips((prev) => {
                const copy = [...prev];
                copy[chamberIdx].slips[slipIdx].slipPhoto = base64;
                return copy;
            });
        } catch (err) {
            console.error("Error capturing slip photo:", err);
        }
    }

    // ----------------------------------
    // 4) Submit the form => POST /loading/sheets
    // ----------------------------------
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!order) return;

        setError(null);
        setLoading(true);

        try {
            // If you store the "loadingIncharge" in localStorage, retrieve it
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
                pumpReadingBefore: pumpReadingBefore
                    ? Number(pumpReadingBefore)
                    : undefined,
                pumpReadingAfter: Number(pumpReadingAfter),

                chamberwiseDipListBefore: chamberwiseDipListBefore.map((dip) => ({
                    ...dip,
                    levelHeight: Number(dip.levelHeight),
                })),

                chamberwiseDipListAfter: chamberwiseDipListAfter.map((dip) => ({
                    ...dip,
                    levelHeight: Number(dip.levelHeight),
                })),

                // Flatten out the seal data if needed
                // Now we might have { sealId, sealPhoto } for each
                chamberwiseSealList: chamberwiseSealList.flatMap((ch) =>
                    ch.seals.map((sealObj) => ({
                        chamberId: ch.chamberId,
                        sealId: sealObj.sealId,
                        sealPhoto: sealObj.sealPhoto, // <--- Only if your schema supports storing it
                    }))
                ),

                // Flatten the slip data
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

            // POST to create loading sheet
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

            // Redirect or show success
            router.push("/loading/orders");
        } catch (err: any) {
            console.error("Error creating loading sheet:", err);
            setError(err.message || "Error creating loading sheet.");
        } finally {
            setLoading(false);
        }
    }

    const resetForm = () => {
        window.location.reload()
    }

    // ----------------------------------
    // Rendering
    // ----------------------------------

    // if (error) {
    //     return <p className="p-4 text-red-600">Error: {error}</p>;
    // }

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

                        {/* Chamberwise Seal List (multiple seals per chamber) */}
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

                                            {/* Show seal photo if captured */}
                                            {seal.sealPhoto && (
                                                <img
                                                    src={seal.sealPhoto}
                                                    alt="Seal Photo"
                                                    className="border w-16 h-16"
                                                />
                                            )}

                                            {/* Button: capture photo for this seal */}
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

                        {/* Pump Slips (multiple slips per chamber) */}
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

                                                {/* Show slip photo if captured */}
                                                {slip.slipPhoto && (
                                                    <img
                                                        src={slip.slipPhoto}
                                                        alt="Slip Photo"
                                                        className="border w-16 h-16"
                                                    />
                                                )}

                                                {/* Button: capture photo for this slip */}
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
                            <Button variant="outline" onClick={(e) => { e.preventDefault(); resetForm() }} type="reset" disabled={loading}>
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
