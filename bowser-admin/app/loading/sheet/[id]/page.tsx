"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { BASE_URL } from "@/lib/api";
import { Bowser, LoadingOrder, OrderBowserResponse } from "@/types";
import Loading from "@/app/loading";

import {
    saveFormData,
    loadFormData,
    clearFormData
} from "@/lib/storage";
import { openEmbeddedCamera } from "@/components/EmbeddedCamera";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogFooter } from "@/components/ui/alert-dialog";

// A single object type for the entire page’s form state
interface LoadingSheetFormData {
    // Server-fetched data (optional to store, but we can store to restore if user refreshes)
    order: LoadingOrder | null;
    bowser: Bowser | null;
    sheetId: string;
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

    loadingSlips: {
        qty: string | number; slipPhoto: string
    }[];
}

export default function LoadingSheetPage() {
    const router = useRouter();
    const params = useParams(); // The [id] from the URL
    const orderId = params.id;
    const STORAGE_KEY = `loadingSheetPageData${orderId}`; // Unique key in localforage

    // -----------------------------------------
    // Loading + Error
    // -----------------------------------------
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [alertMessage, setAlertMessage] = useState<string>()
    const [alertDialogOpen, setAlertDialogOpen] = useState<boolean>(false)

    // -----------------------------------------
    // Server-Fetched Data
    // -----------------------------------------
    const [order, setOrder] = useState<LoadingOrder | null>(null);
    const [bowser, setBowser] = useState<Bowser | null>(null);
    const [sheetId, setSheetId] = useState<string>("");

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
    const [loadingSlips, setLoadingSlips] = useState<
        {
            qty: string | number; slipPhoto: string
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
                    setSheetId(saved.sheetId);
                    setBowser(saved.bowser);

                    setOdoMeter(saved.odoMeter);
                    setFuleingMachine(saved.fuleingMachine);
                    setPumpReadingBefore(saved.pumpReadingBefore);
                    setPumpReadingAfter(saved.pumpReadingAfter);
                    setChamberwiseDipListBefore(saved.chamberwiseDipListBefore);
                    setChamberwiseDipListAfter(saved.chamberwiseDipListAfter);
                    setChamberwiseSealList(saved.chamberwiseSealList);
                    setLoadingSlips(saved.loadingSlips);
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
                    console.log("order: ", order)

                    // If user has no local data, or we want to override
                    if (!didCancel) {
                        setOrder(order);
                        setBowser(bowser);

                        // check for created tripsheet by fetching baseurl/loadig/tripsheet/${orderId} to update, if already created then set the data else the below data

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
                            setLoadingSlips([{ qty: 0, slipPhoto: "" }]);
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
            sheetId,
            bowser,
            odoMeter,
            fuleingMachine,
            pumpReadingBefore,
            pumpReadingAfter,
            chamberwiseDipListBefore,
            chamberwiseDipListAfter,
            chamberwiseSealList,
            loadingSlips,
        };
        saveFormData(STORAGE_KEY, formData).catch((err) => {
            console.error("Failed to save form data:", err);
        });
    }, [
        order,
        sheetId,
        bowser,
        odoMeter,
        fuleingMachine,
        pumpReadingBefore,
        pumpReadingAfter,
        chamberwiseDipListBefore,
        chamberwiseDipListAfter,
        chamberwiseSealList,
        loadingSlips
    ]);

    // -----------------------------------------
    // 3) Handle Camera for Seals
    // -----------------------------------------
    async function handleSealPhoto(chamberIdx: number, sealIdx: number) {
        try {
            const base64 = await openEmbeddedCamera();
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
    async function handleSlipPhoto(slipIdx: number) {
        try {
            const base64 = await openEmbeddedCamera();
            setLoadingSlips((prev) => {
                const copy = [...prev];
                copy[slipIdx].slipPhoto = base64;
                return copy;
            });
        } catch (err) {
            console.error("Error capturing slip photo:", err);
        }
    }

    // -----------------------------------------
    // 8) Check for Empty Fields
    // -----------------------------------------
    function checkFieldsFilled(): boolean {
        if (!odoMeter) {
            setAlertMessage("Odometer field is required.");
            setAlertDialogOpen(true);
            return false;
        }
        if (!fuleingMachine) {
            setAlertMessage("Fueling Machine field is required.");
            setAlertDialogOpen(true);
            return false;
        }
        if (!pumpReadingBefore) {
            setAlertMessage("Pump Reading (Before) field is required.");
            setAlertDialogOpen(true);
            return false;
        }
        if (!pumpReadingAfter) {
            setAlertMessage("Pump Reading (After) field is required.");
            setAlertDialogOpen(true);
            return false;
        }
        for (const dip of chamberwiseDipListBefore) {
            if (!dip.levelHeight) {
                setAlertMessage(`Chamberwise Dip (Before) for ${dip.chamberId} is required.`);
                setAlertDialogOpen(true);
                return false;
            }
        }
        for (const dip of chamberwiseDipListAfter) {
            if (!dip.levelHeight) {
                setAlertMessage(`Chamberwise Dip (After) for ${dip.chamberId} is required.`);
                setAlertDialogOpen(true);
                return false;
            }
        }
        for (const ch of chamberwiseSealList) {
            for (const seal of ch.seals) {
                if (!seal.sealId) {
                    setAlertMessage(`Seal ID and Seal Photo for Chamber ${ch.chamberId} are required.`);
                    setAlertDialogOpen(true);
                    return false;
                }
            }
        }
        for (const slip of loadingSlips) {
            if (!slip.qty) {
                setAlertMessage("Loading Slip quantity and Slip Photo are required.");
                setAlertDialogOpen(true);
                return false;
            }
        }

        return true; // All fields are filled
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

        // Check if all fields are filled
        if (!checkFieldsFilled()) {
            return; // Prevent submission if fields are empty
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
                sheetId: order.tripSheetId,
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

                loadingSlips: loadingSlips.map((slip) => ({
                    qty: Number(slip.qty),
                    slipPhoto: slip.slipPhoto,
                })),

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
            console.log(err.missingFields)
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
        setLoadingSlips([]);
        // Also remove from localforage
        clearFormData(STORAGE_KEY).catch((err) => {
            console.error("Failed to clear form data:", err);
        });
        router.refresh()
    }

    // -----------------------------------------
    // 7) Rendering
    // -----------------------------------------

    // If still loading but we do have data, you could show partial form, or a spinner overlay
    // if (loading) { ... optional ... }

    if (error) {
        return <p className="p-4 text-red-600">Error: {error}</p>;
    }

    // If we never got an order or bowser

    return (
        <div className="mx-auto py-8 container">
            {(loading && !order && !bowser) && <Loading />}
            {(!order || !bowser) &&
                <p className="p-4">No data found.</p>
            }

            <Card>
                <CardHeader>
                    <CardTitle>
                        Create Loading Sheet for: {order?.regNo}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Global Fields */}
                        <div className="p-2 rounded">
                            <div className="flex flex-col gap-2 mb-4">
                                <Label>Odometer</Label>
                                <Input
                                    type="string"
                                    value={odoMeter}
                                    onChange={(e) => setOdoMeter(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2 mb-4">
                                <Label>Fueling Machine</Label>
                                <Input
                                    placeholder="Machine Id or petrol pump desctioption"
                                    value={fuleingMachine}
                                    onChange={(e) => setFuleingMachine(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2 mb-4">
                                <Label>Bowser Pump Reading (Before loading starts)</Label>
                                <Input
                                    type="string"
                                    value={pumpReadingBefore}
                                    onChange={(e) => setPumpReadingBefore(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-2 mb-4">
                                <Label>Bowser Pump Reading (After loading done)</Label>
                                <Input
                                    type="string"
                                    value={pumpReadingAfter}
                                    onChange={(e) => setPumpReadingAfter(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Chamberwise Dip BEFORE */}
                        <Separator />
                        <div className="p-2 rounded">
                            <h4 className="mb-2 font-semibold">Chamberwise Dip (Before loading)</h4>
                            {chamberwiseDipListBefore.map((dip, idx) => (
                                <div key={dip.chamberId} className="flex flex-col space-y-1 mb-2">
                                    <Label className="w-24">{dip.chamberId}</Label>
                                    <Input
                                        type="string"
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
                        <Separator />
                        <div className="p-2 rounded">
                            <h4 className="mb-2 font-semibold">Chamberwise Dip (After loading done)</h4>
                            {chamberwiseDipListAfter.map((dip, idx) => (
                                <div key={dip.chamberId} className="flex flex-col space-y-1 mb-2">
                                    <Label className="w-24">{dip.chamberId}</Label>
                                    <Input
                                        type="string"
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
                        <Separator />
                        <div className="p-2 rounded">
                            <h4 className="mb-2 font-semibold">Chamberwise Seal List</h4>
                            {chamberwiseSealList.map((ch, chamberIdx) => (
                                <div key={ch.chamberId} className="mb-4">
                                    <p className="font-semibold">{ch.chamberId}</p>
                                    {ch.seals.map((seal, sealIdx) => (
                                        <div key={sealIdx} className="flex flex-col space-y-1 mb-2">
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
                                                    className="border rounded-md w-full sm:w-52 h-auto"
                                                />
                                            )}
                                            <div className="flex flex-row justify-around w-full">
                                                <Button variant="secondary"
                                                    className="flex-[0.4]"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setChamberwiseSealList((prev) => {
                                                            const copy = [...prev];
                                                            copy[chamberIdx] = {
                                                                ...copy[chamberIdx],
                                                                seals: copy[chamberIdx].seals.filter((_, index) => index !== sealIdx),
                                                            };
                                                            return copy;
                                                        });
                                                    }}>- Remove</Button>
                                                <Button
                                                    className="flex-[0.4]"
                                                    variant="default"
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        await handleSealPhoto(chamberIdx, sealIdx);
                                                    }}
                                                    onDrop={async (e) => {
                                                        e.preventDefault();
                                                        const file = e.dataTransfer.files[0];
                                                        if (file && file.type.startsWith("image/")) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setChamberwiseSealList((prev) => {
                                                                    const copy = [...prev];
                                                                    copy[chamberIdx].seals[sealIdx].sealPhoto = reader.result as string;
                                                                    return copy;
                                                                });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                    onDragOver={(e) => e.preventDefault()}
                                                >
                                                    {seal.sealPhoto ? "Retake Photo" : "Take Photo"}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        className="w-full"
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
                        <Separator />
                        <div className="p-2 rounded">
                            <h4 className="mb-2 font-semibold">Loading Slip/s</h4>
                            {loadingSlips?.map((slip, slipIdx) => (
                                <div key={slipIdx} className="mb-4">
                                    <div className="flex flex-col mb-2">
                                        <div className="flex flex-col space-y-1 mb-2">
                                            <Label>Slip #{slipIdx + 1}</Label>
                                            <Input
                                                type="string"
                                                placeholder="Qty"
                                                value={slip.qty}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setLoadingSlips((prev) => {
                                                        const copy = [...prev];
                                                        copy[slipIdx] = { ...copy[slipIdx], qty: newVal };
                                                        return copy;
                                                    });
                                                }}
                                            />

                                            {slip.slipPhoto && (
                                                <img
                                                    src={slip.slipPhoto}
                                                    alt="Slip Photo"
                                                    className="border rounded-md w-full sm:w-52 h-auto"
                                                />
                                            )}

                                            <div className="flex flex-row justify-around w-full">
                                                <Button variant="secondary"
                                                    className="flex-[0.4]"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setLoadingSlips((prev) => {
                                                            return prev.filter((_, index) => index !== slipIdx);
                                                        });
                                                    }}>- Remove</Button>
                                                <Button
                                                    className="flex-[0.4]"
                                                    variant="default"
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        await handleSlipPhoto(slipIdx);
                                                    }}
                                                    onDrop={async (e) => {
                                                        e.preventDefault();
                                                        const file = e.dataTransfer.files[0];
                                                        if (file && file.type.startsWith("image/")) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setLoadingSlips((prev) => {
                                                                    const copy = [...prev];
                                                                    copy[slipIdx].slipPhoto = reader.result as string;
                                                                    return copy;
                                                                });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                    onDragOver={(e) => e.preventDefault()}
                                                >
                                                    {slip.slipPhoto ? "Retake Photo" : "Take Photo"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setLoadingSlips((prev) => [
                                        ...prev,
                                        { qty: "", slipPhoto: "" },
                                    ]);
                                }}
                            >
                                + Add Slip
                            </Button>
                        </div>

                        {/* Error Display */}
                        {error && <p className="text-red-600">{error}</p>}

                        <div className="flex justify-around gap-4 w-full">
                            {/* Reset */}
                            <Button variant="outline" className="flex-[0.4]" onClick={(e) => { e.preventDefault(); resetForm(); }} disabled={loading}>
                                {loading ? "Submitting..." : "Reset"}
                            </Button>

                            {/* Submit */}
                            <Button type="submit" disabled={loading} className="flex-[0.4]">
                                {loading ? "Submitting..." : "Submit"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Alert Dialog for Error Messages */}
            <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Error</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertMessage}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => {
                            setAlertDialogOpen(false);
                        }}>
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
