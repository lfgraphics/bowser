"use client"
import Loading from "@/app/loading";
import { SearchModal } from "@/components/SearchModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BASE_URL } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { TripSheet, User } from "@/types";
import { searchItems } from "@/utils/searchUtils";
import { useEffect, useState } from "react";

const page = ({ params }: { params: Promise<{ id: string }> }) => {
    const [tripsheetId, setTripsheetId] = useState<string>("");
    useEffect(() => {
        (async () => {
            const { id } = await params;
            setTripsheetId(id);
        })();
    }, [params]);

    const [tripSheet, setTripSheet] = useState<TripSheet | null>(null);
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
    const [bowserDriver, setBowserDriver] = useState<{ handOverDate: Date; name: string; phoneNo: string }[]>([
        { handOverDate: new Date(), name: '', phoneNo: '' },
    ]);

    useEffect(() => {
        async function fetchLoadingSheet() {
            try {
                setIsLoading(true);
                setError(null);
                const res = await fetch(`${BASE_URL}/tripSheet/find-by-id/${tripsheetId}`, {
                    method: "GET",
                });
                if (!res.ok) {
                    throw new Error(`Failed to fetch loading sheet. Status: ${res.status}`);
                }
                const data: TripSheet = await res.json();
                setTripSheet(data);
                console.log(data)
            } catch (err: any) {
                setError(err.message || "Error fetching loading sheet.");
            } finally {
                setIsLoading(false);
            }
        }

        if (tripsheetId) {
            fetchLoadingSheet();
        }
    }, [tripsheetId]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
    }
    return (
        <>
            {
                error && <div className="text-destructive">Error: {error}</div>
            }
            {isLoading && <Loading />}
            <Card className="mt-8">
                <CardHeader><strong>{tripSheet?.tripSheetId}</strong> Created at: {formatDate(tripSheet?.createdAt!)}</CardHeader>
                <CardDescription className="p-3"><strong>Total Load Qty:</strong> {tripSheet?.totalLoadQuantity?.toFixed(2)}, <strong>Sold: </strong>{tripSheet?.saleQty?.toFixed(2)}, <strong>Current load/ Balance: </strong>{tripSheet?.balanceQty?.toFixed(2)} Liters <br />
                    <span className="pt-3 text-foreground">
                        Current Driver/s:
                        {tripSheet?.bowser.driver.map((driver, index) => (
                            <span key={index}>
                                <span>#{index + 1}</span> <br />
                                <strong>Name: </strong>{driver.name} <br />
                                <strong>Phone No.: </strong>{driver.phoneNo}
                            </span>
                        ))}
                    </span></CardDescription>
                <form onSubmit={handleSubmit}>
                    <CardContent className="flex flex-col justify-around bg-card my-6 mt-0 px-4 rounded-md">
                        <Separator />
                        <p className="pt-4 font-semibold text-lg">Select a new One</p> <br />
                        {bowserDriver.map((driver, index) => (
                            <div key={index} className="w-full">
                                <Label>{`Driver Name`}</Label>
                                <Input
                                    value={driver.name}
                                    onChange={(e) =>
                                        setBowserDriver(
                                            bowserDriver.map((d, i) => (i === index ? { ...d, name: e.target.value } : d))
                                        )
                                    }
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
                    </CardContent>
                    <CardFooter className="flex justify-between w-full">
                        <Button disabled={isLoading} type="reset" variant="secondary" className="flex-[0.4]"> {isLoading ? "Submiting..." : "Reset"}</Button>
                        <Button disabled={isLoading} type="submit" variant="default" className="flex-[0.4]"> {isLoading ? "Submiting..." : "Submit"}</Button>
                    </CardFooter>
                </form>
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
        </>
    )
}

export default page