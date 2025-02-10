"use client"
import { SearchModal } from "@/components/SearchModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Loading from "@/app/loading";
import { BASE_URL } from "@/lib/api";
import { FormEvent, useEffect, useState } from "react";
import { TripSheet, User } from "@/types";
import { searchItems } from "@/utils/searchUtils";

const page = ({ params }: { params: { id: string } }) => {
    const sheetId = params.id; // Extract `id` from params

    const [regNo, setRegNo] = useState("");
    const [loadingDesc, setLoadingDesc] = useState("");
    const [prpoduct, setProduct] = useState("");
    const [locationName, setLocationName] = useState("");
    const [loadingLocation, setLoadingLocation] = useState("");
    const [petrolPumpName, setPetrolPumpName] = useState<string>("");
    const [petrolPumpPhoneNo, setPetrolPumpPhoneNo] = useState<string>("");
    const [trip, setTrip] = useState<TripSheet>()

    // Admin user data from localStorage
    const [adminUser, setAdminUser] = useState<User | null>(null);

    // Loading & error states
    const [loading, setLoading] = useState(false);
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

    // On mount, parse localStorage to get `adminUser`
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("adminUser");
            if (storedUser) {
                setAdminUser(JSON.parse(storedUser));
            }
        } catch (err) {
            console.error("Error parsing adminUser from localStorage", err);
        }

        const getTripBowser = async () => {
            try {
                const response = await fetch(`${BASE_URL}/tripSheet/find-by-id/${sheetId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const tripSheet = await response.json();
                if (tripSheet) {
                    setTrip(tripSheet);
                    setRegNo(tripSheet.bowser.regNo);
                }
            } catch (error) {
                console.error("Error fetching trip sheet:", error);
            }
        }

        getTripBowser();

    }, []);

    // Handle form submission
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const body = {
                regNo,
                prpoduct,
                loadingDesc,
                loadingLocation,
                loadingLocationName: locationName,
                tripSheetId: sheetId,
                petrolPump: {
                    name: petrolPumpName,
                    phone: petrolPumpPhoneNo
                },
                bccAuthorizedOfficer: {
                    id: adminUser?.userId ?? "", // or adminUser?._id
                    name: adminUser?.name ?? "",
                },
            };
            console.log(body)

            const res = await fetch(`${BASE_URL}/loading/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                // Attempt to parse error
                let errorMsg = "Failed to create loading order.";
                try {
                    const errData = await res.json();
                    errorMsg = errData.error || errorMsg;
                } catch {
                    /* ignore JSON parse error */
                }
                throw new Error(errorMsg);
            }

            // Success
            window.location.replace("/loading/orders");
        } catch (err: any) {
            console.error("Error creating order:", err);
            setError(err.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    }

    const searchPetrolPump = async () => {
        setLoading(true);
        try {
            const petrolPumps = await searchItems<User>({
                url: `${BASE_URL}/searchDriver/petrolPump`, //https://bowser-backend-2cdr.onrender.com
                searchTerm: petrolPumpName,
                errorMessage: 'No petrol pump accound found with the given name'
            });
            console.log(petrolPumps)
            if (petrolPumps.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Petrol Pump Personnel Account",
                    items: petrolPumps,
                    onSelect: handlePetrolPumpSelection,
                    renderItem: (pump) => `${pump.name}`,
                    keyExtractor: (pump) => pump.name,
                });
            }
        } catch (error) {
            console.error('Error searching for driver:', error);
        } finally {
            setLoading(false);
        }
    }

    const handlePetrolPumpSelection = (petrolPump: { name: string, phoneNo: string }) => {
        setPetrolPumpName(petrolPump.name);
        setPetrolPumpPhoneNo(petrolPump.phoneNo);
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));
    }

    return (
        <div className="mx-auto py-8 w-full container">
            {loading && <Loading />}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Create Additional Loading Order for {trip?.tripSheetId}</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error display */}
                        {error && <p className="text-red-600">{error}</p>}

                        {/* regNo field */}
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="regNo">Reg No</Label>
                            <Input
                                id="regNo"
                                placeholder="Bowser registration number"
                                value={regNo}
                                readOnly
                                required
                            />
                        </div>

                        {/* loadingDesc field */}
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="desc">Description</Label>
                            <Input
                                id="desc"
                                placeholder="Your message to the petrol pump or the loading incharges"
                                value={loadingDesc}
                                onChange={(e) => setLoadingDesc(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="product">Product</Label>
                            <Input
                                required
                                id="product"
                                placeholder="Product (HVO/HSD)"
                                value={prpoduct}
                                onChange={(e) => setProduct(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="loadingLocationName">Loading Location Name</Label>
                            <Input
                                required
                                id="loadingLocationName"
                                placeholder="Location Name (Gida/Reliance)"
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="loadingLocation">Loading Location</Label>
                            <RadioGroup
                                defaultValue="bcc"
                                id="loadingLocation"
                                value={loadingLocation}
                                onValueChange={(e) => setLoadingLocation(e)}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="bcc" id="r1" />
                                    <Label htmlFor="r1">Bcc</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="petrolPump" id="r2" />
                                    <Label htmlFor="r2">Petrol Pump</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        {loadingLocation === "petrolPump" && <div className="flex flex-col space-y-1">
                            <Label htmlFor="petrolPump">Select Petrol Pump</Label>
                            <Input
                                id="petrolPump"
                                placeholder={"Enter name or phone no. to search ↵"}
                                value={petrolPumpName}
                                onChange={(e) => setPetrolPumpName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        searchPetrolPump();
                                    }
                                }}
                            />
                            <Input
                                id="petrolPumpPhone"
                                placeholder="Enter Phone No."
                                value={petrolPumpPhoneNo}
                                onChange={(e) => setPetrolPumpPhoneNo(e.target.value)}
                            />
                        </div>}
                        <Button type="submit" disabled={loading}>
                            Create Order
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

export default page