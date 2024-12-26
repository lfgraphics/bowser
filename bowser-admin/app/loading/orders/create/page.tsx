"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

import { BASE_URL } from "@/lib/api";
import Loading from "@/app/loading";
import { ResponseBowser } from "@/types";
import { searchItems } from "@/utils/searchUtils";
import { SearchModal } from "@/components/SearchModal";

interface AdminUser {
    _id?: string;
    userId?: string;
    name?: string;
    phoneNumber?: string;
    // ... other fields if needed
}

export default function CreateLoadingOrderPage() {
    const router = useRouter();

    // Local form fields
    const [regNo, setRegNo] = useState("");
    const [loadingDesc, setLoadingDesc] = useState("");

    // Admin user data from localStorage
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

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
    }, []);

    // Handle form submission
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Prepare the payload
            // bccAuthorizedOfficer can use userId or _id (depending on your DB schema).
            // For example, if you want `id` = userId:
            const body = {
                regNo,
                loadingDesc,
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
            router.push("/loading/orders");
        } catch (err: any) {
            console.error("Error creating order:", err);
            setError(err.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    }

    const searchBowser = async (bowser: string) => {
        setLoading(true);
        try {
            const response: ResponseBowser[] = await searchItems<ResponseBowser>({
                url: `${BASE_URL}/searchBowserDetails`,
                searchTerm: bowser,
                errorMessage: `No proper details found with the given regNo ${bowser}`
            });
            console.log(response)
            if (response.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Bowser",
                    items: response,
                    onSelect: handleBowserSelection,
                    renderItem: (bowser) => `Bowser: ${bowser.regNo}`,
                    keyExtractor: (bowser) => bowser.regNo,
                });
            }
        } catch (error) {
            console.error('Error searching for driver:', error);
        } finally {
            setLoading(false);
        }
    }
    const handleBowserSelection = (bowser: ResponseBowser) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (bowser) {
            setRegNo(bowser.regNo);
        }
    }

    return (
        <div className="mx-auto py-8 max-w-lg container">
            {loading && <Loading />}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Create New Loading Order</CardTitle>
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
                                onChange={(e) => setRegNo(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        searchBowser(regNo);
                                    }
                                }}
                                required
                            />
                        </div>

                        {/* loadingDesc field */}
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="loadingDesc">Description</Label>
                            <Input
                                id="loadingDesc"
                                placeholder="Description"
                                value={loadingDesc}
                                onChange={(e) => setLoadingDesc(e.target.value)}
                            />
                        </div>

                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Create Order"}
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
