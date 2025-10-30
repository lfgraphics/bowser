"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { BASE_URL } from "@/lib/api";
import Loading from "@/app/loading";
import { LoadingSheet, TripSheetPayload, User } from "@/types";
import { SearchModal } from "@/components/SearchModal";
import { searchItems } from "@/utils/searchUtils";

export default function TripSheetCreatePage() {
    const router = useRouter();
    const params = useParams(); // from /tripsheets/create/[loadingSheetId]
    const loadingSheetId = params.id;

    // States
    const [loadingSheet, setLoadingSheet] = useState<LoadingSheet | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
    // Form fields for the new TripSheet
    // Pre-fill from the loadingSheet once fetched
    const [regNo, setRegNo] = useState("");
    const [hsdRate, setHsdRate] = useState<string>('');
    const [bowserDriver, setBowserDriver] = useState<{ handOverDate: Date; name: string; phoneNo: string }[]>([
        { handOverDate: new Date(), name: '', phoneNo: '' },
    ]);
    const [odometerStartReading, setOdometerStartReading] = useState<number | undefined>(undefined);
    const [pumpEndReading, setPumpEndReading] = useState<number>(0);
    const [fuelingAreaDestination, setFuelingAreaDestination] = useState("");
    const [proposedDepartureTime, setProposedDepartureTime] = useState("");
    // The "loading" subdoc
    const [quantityByDip, setQuantityByDip] = useState(0);
    const [quantityBySlip, setQuantityBySlip] = useState(0);
    const [tempLoadByDip, setTempLoadByDip] = useState(0);

    // -------------------------------------------
    // 1) Fetch the LoadingSheet by ID
    // -------------------------------------------
    useEffect(() => {
        async function fetchLoadingSheet() {
            try {
                setIsLoading(true);
                setError(null);
                const res = await fetch(`${BASE_URL}/loading/sheets/${loadingSheetId}`, {
                    method: "GET",
                });
                if (!res.ok) {
                    throw new Error(`Failed to fetch loading sheet. Status: ${res.status}`);
                }
                const data: LoadingSheet = await res.json();
                setLoadingSheet(data);
                console.log(data)

                // Pre-fill form with data from the loading sheet
                setRegNo(data.regNo);
                setOdometerStartReading(data.odoMeter);
                setQuantityByDip(data.totalLoadQuantityByDip || 0);
                setQuantityBySlip(data.totalLoadQuantityBySlip || 0);
                setTempLoadByDip(data.tempLoadByDip || 0);
                setPumpEndReading(data.pumpReadingAfter || 0)
            } catch (err: any) {
                setError(err.message || "Error fetching loading sheet.");
            } finally {
                setIsLoading(false);
            }
        }

        if (loadingSheetId) {
            fetchLoadingSheet();
        }
    }, [loadingSheetId]);

    // -------------------------------------------
    // 2) Driver fetching and selection
    // -------------------------------------------
    const searchDriver = async (name: string) => {
        setIsLoading(true);
        try {
            const drivers = await searchItems<User>({
                url: `${BASE_URL}/searchDriver/bowser-drivers`, //https://bowser-backend-2cdr.onrender.com
                searchTerm: name,
                errorMessage: 'No driver found with the given ID'
            });
            if (drivers.length > 0) {
                console.log(drivers)
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Driver",
                    items: drivers,
                    onSelect: handleDriverSelection,
                    renderItem: (driver) => `${driver.name} (${driver.phoneNo})`,
                    keyExtractor: (driver) => driver.phoneNo,
                });
            }
        } catch (error) {
            console.error('Error searching for driver:', error);
        } finally {
            setIsLoading(false);
        }
    }
    const handleDriverSelection = (driver: User) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (driver) {
            setBowserDriver([{ ...driver, name: driver.name, phoneNo: driver.phoneNo ? driver.phoneNo : "", handOverDate: new Date() }]);
        }
    }
    // -------------------------------------------
    // 3) Handle Form Submission => POST /tripSheet/create
    // -------------------------------------------
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!loadingSheet) return;

        try {
            setIsLoading(true);
            setError(null);

            const body: TripSheetPayload = {
                bowser: {
                    regNo,
                    driver: bowserDriver,
                    odometerStartReading,
                    pumpEndReading,
                },
                hsdRate: Number(hsdRate),
                fuelingAreaDestination,
                proposedDepartureTime,
                loading: {
                    sheetId: loadingSheet._id,
                    quantityByDip,
                    quantityBySlip,
                    tempLoadByDip,
                },
            };

            const res = await fetch(`${BASE_URL}/tripSheet/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errData = await res.json();
                setError(errData?.message || "Failed to create TripSheet.");
                throw new Error(errData?.message || "Failed to create TripSheet.");
            }

            const created = await res.json();
            console.log("Created TripSheet:", created);

            router.replace(`/tripsheets/`);
        } catch (err: any) {
            console.error(err);
            // setError(err.message || "Error creating TripSheet.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="mx-auto py-8 container">
            {(isLoading || !loadingSheet) && <Loading />}
            {!loadingSheet && <p className="p-4">No LoadingSheet data found.</p>}
            {error && <p className="p-4 text-red-600">Error: {error}</p>}
            <Card>
                <CardHeader>
                    <CardTitle>Create TripSheet</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Bowser / Odometer */}
                        <div className="flex flex-col gap-2 p-2 border rounded">
                            <div className="flex flex-col gap-2 mb-3">
                                <Label>Bowser RegNo</Label>
                                <Input
                                    readOnly
                                    value={regNo}
                                    onChange={(e) => setRegNo(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-2 mb-3">
                                <Label>Odometer Start Reading</Label>
                                <Input
                                    readOnly
                                    type="number"
                                    value={odometerStartReading || ""}
                                    onChange={(e) => setOdometerStartReading(Number(e.target.value))}
                                />
                            </div>
                            <div className="flex flex-col gap-2 mb-3">
                                <Label>Pump End Reading</Label>
                                <Input
                                    value={pumpEndReading}
                                    onChange={(e) => setPumpEndReading(Number(e.target.value))}
                                    placeholder="E.g. final pump reading after load"
                                />
                            </div>
                        </div>

                        {/* Loading Data */}
                        <div className="p-2 border rounded">
                            <h4 className="mb-2 font-semibold">Loading Sheet Info</h4>
                            {/* Pre-filled from loadingSheet */}
                            <div className="flex flex-col gap-2 mb-3">
                                <Label>Quantity By Dip</Label>
                                <Input
                                    readOnly
                                    type="number"
                                    value={quantityByDip.toFixed(2)}
                                />
                            </div>
                            <div className="flex flex-col gap-2 mb-3">
                                <Label>Quantity By Slip</Label>
                                <Input
                                    readOnly
                                    type="number"
                                    value={quantityBySlip}
                                />
                            </div>
                            <div className="flex flex-col gap-2 mb-3">
                                <Label>Load before + Load by Slip</Label>
                                <Input
                                    readOnly
                                    type="number"
                                    value={tempLoadByDip.toFixed(2)}
                                />
                            </div>
                        </div>

                        {/* Driveer */}
                        {bowserDriver.map((driver, index) => (
                            <div key={index} className="mb-4 pt-4 border-t">
                                <Label>{`Driver Name`}</Label>
                                <Input
                                    value={driver.name}
                                    onChange={(e:any) => {
                                        setBowserDriver(
                                            bowserDriver.map((d, i) => (i === index ? { ...d, name: e.target.value } : d))
                                        )
                                        const nativeEvent = e.nativeEvent as InputEvent;
                                        if (nativeEvent.inputType === "insertText" && e.currentTarget.value.length > 3) {
                                            if (e.nativeEvent.data) {
                                                searchDriver(e.currentTarget.value);
                                            }
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && driver.name.length > 3) {
                                            e.preventDefault();
                                            searchDriver(driver.name);
                                        }
                                    }}
                                    placeholder="Enter Driver Name"
                                />
                                <Label>{`Driver Phone No`}</Label>
                                <Input
                                    value={driver.phoneNo}
                                    onChange={(e) =>
                                        setBowserDriver(
                                            bowserDriver.map((d, i) => (i === index ? { ...d, phoneNo: e.target.value } : d))
                                        )
                                    }
                                    placeholder="Enter Phone No"
                                />
                            </div>
                        ))}
                        {/* Additional fields (fuelingAreaDestination, etc.) */}
                        <div className="p-2 border rounded">
                            <div className="flex flex-col gap-2 mb-3">
                                <Label>Fueling Area Destination</Label>
                                <Input
                                    value={fuelingAreaDestination}
                                    onChange={(e) => setFuelingAreaDestination(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-2 mb-3">
                                <Label>Proposed Departure Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={proposedDepartureTime}
                                    onChange={(e) => setProposedDepartureTime(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-2 mb-3">
                                <Label>Effective HSD Rate as of Today</Label>
                                <Input
                                    type="text"
                                    value={hsdRate}
                                    onChange={(e) => setHsdRate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Error Display */}
                        {error && <p className="text-red-600">{error}</p>}

                        {/* Submit */}
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Creating..." : "Create TripSheet"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <SearchModal
                isOpen={searchModalConfig.isOpen}
                onClose={() => setSearchModalConfig((prev) => ({ ...prev, isOpen: false }))}
                title={searchModalConfig.title}
                items={searchModalConfig.items}
                onSelect={searchModalConfig.onSelect}
                renderItem={searchModalConfig.renderItem}
                keyExtractor={searchModalConfig.keyExtractor}
            />
        </div>
    );
}
