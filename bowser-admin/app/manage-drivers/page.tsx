import { useEffect, useState } from "react"

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BASE_URL } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Driver, SignUpRequests } from "@/types"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchModal } from "@/components/SearchModal";
import { formatDate } from "@/lib/utils";
import { searchItems } from "@/utils/searchUtils";
import { useDebounceEffect, updateDriverMobile, updateTripDriver } from "@/utils";

import Loading from "../loading";

const page = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<Driver[]>();
    const [signupRequests, setSignupRequests] = useState<SignUpRequests[]>();
    const [updateDriverId, setUpdateDriverId] = useState<string>('');
    const [driverId, setDriverId] = useState<string>('');
    const [updateType, setUpdateType] = useState<'Reset Password' | 'Change Phone No.' | 'Create Account' | ''>('');
    const [updateValue, setUpdateValue] = useState<string>('');
    const [params, setParams] = useState<string>('');
    const [driverVehicles, setDriverVehicles] = useState<string[]>()
    const [updateDialogOpen, setUpdateDialogOpen] = useState<boolean>(false);
    const [alreadyRegistered, setAlreadyRegistered] = useState<boolean>(false);
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

    const fetchData = async () => {
        setLoading(true)
        try {
            const signupRequests = await fetch(`${BASE_URL}/auth/driver/signup-requests?searchParam=${params}`)
            const requestsData = await signupRequests.json()
            setSignupRequests(requestsData);
            const response = await fetch(`${BASE_URL}/tanker-drivers?params=${params}`)
            const responseData = await response.json()
            const manipulatedData = responseData?.map((driver: Driver) => ({
                ...driver,
                isRegistered: !!driver.password
            }));
            setData(manipulatedData)
        } catch (err) {
            console.log(err)
            toast.error(String(err))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useDebounceEffect(() => { fetchData(); }, 1500, [params])

    const deleteDriver = async (id: string) => {
        setLoading(true)
        try {
            let response = await fetch(`${BASE_URL}/tanker-drivers/${id}`, {
                method: "DELETE"
            });
            const jsonResponse = await response.json();
            if (!response.ok) {
                console.log(jsonResponse)
                toast.error(String(jsonResponse.message))
            }else{
                toast.success("Deleted Successfully");
            }
        } catch (err) {
            console.log(err);
            toast.error("failed to delted, got some error");
        } finally {
            setLoading(false)
        }
    }

    const updateDriverDetail = async () => {
        setLoading(true)
        const updatingDriverId = data?.find((driver) => driver.Name == updateDriverId)?.Name
        if (updateType == "Change Phone No.") {
            try {
                await updateDriverMobile(updatingDriverId!, updateValue);
                toast.success("Updated Mobile No Successfully", {
                    richColors: true,
                    closeButton: true,
                });
            } catch (error) {
                toast.error("Failed to update driver mobile number. Please try again.", { richColors: true, description: String(error) });
                return;
            } finally {
                setLoading(false);
                setUpdateDialogOpen(false)
            }
        } else {
            try {
                let response = await fetch(`${BASE_URL}/tanker-drivers/change-password/${updateDriverId}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        password: updateValue
                    })
                });
                const jsonResponse = await response.json();
                if (!response.ok) {
                    console.log(jsonResponse)
                    toast.error("Error changing password", { description: String(jsonResponse.err.code), richColors: true })
                    return
                } else {
                    setData(prevData =>
                        prevData?.map(driver =>
                            driver.Name === updateDriverId ? { ...driver, ...jsonResponse.updateDriver } : driver
                        )
                    )
                    toast.success(jsonResponse.message, { richColors: true });
                }
            } catch (error) {
                toast.error("Failed to update Password. Please try again.", { richColors: true, description: typeof error === "object" && error !== null && "message" in error ? String((error as { message?: unknown }).message) : String(error) });
            } finally {
                setUpdateDialogOpen(false);
                setLoading(false)
            }
        }
    }

    const blockDriver = async (id: string) => {
        if (!id) {
            alert("id is requrie.")
            return
        }
        let userChoice = confirm("Are you sure to block this driver?");
        if (!userChoice) return;
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/tanker-drivers/block-driver/${id}`);
            const data = await response.json();
            if (!response.ok) {
                console.error(data)
                toast.error(data.message, { richColors: true, description: data.message || "An error occured!" })
            } else {
                setData(prevData =>
                    prevData?.map(driver =>
                        driver.Name === updateDriverId ? { ...driver, ...data.updateDriver } : driver
                    )
                )
                toast.success(data.message, { richColors: true })
            }
        } catch (err) {
            console.error(err)
            toast.error("Error blocking Driver", {
                description: typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code) : String(err),
                richColors: true
            })
        }
    }

    const unBlockDriver = async (id: string) => {
        if (!id) {
            alert("id is requrie.")
            return
        }
        let userChoice = confirm("Are you sure to unblock this driver?");
        if (!userChoice) return;
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/tanker-drivers/unblock-driver/${id}`);
            const data = await response.json();
            if (!response.ok) {
                console.error(data)
                toast.error(data.message, { richColors: true, description: data.message || "An error occured!" })
            } else {
                setData(prevData =>
                    prevData?.map(driver =>
                        driver.Name === updateDriverId ? { ...driver, ...data.updateDriver } : driver
                    )
                )
                toast.success(data.message, { richColors: true })
            }
        } catch (err) {
            console.error(err)
            toast.error("Error un blocking Driver", {
                description: typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code) : String(err),
                richColors: true
            })
        }
    }

    const findDriversVehicles = async (id: string) => {
        try {
            setLoading(true)
            const response = await fetch(`${BASE_URL}/fuel-request/driver?driverId=${id}`);
            const vehiclesData = await response.json();
            if (!response.ok) {
                toast.error("Can't find vehicles of the driver", {
                    description: String(vehiclesData.message),
                    richColors: true
                })
            }
            setDriverVehicles(vehiclesData);
        } catch (err) { } finally {
            setLoading(false)
        }
    }

    const markAsKeypadUser = async (id: string) => {
        if (!id) {
            alert("id is requrie.")
            return
        }
        let userChoice = confirm("Are you sure to mark this driver as a keypad user?");
        if (!userChoice) return;
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/tanker-drivers/mark-as-keypd/${id}`);
            const data = await response.json();
            if (!response.ok) {
                console.error(data)
                toast.error(data.message, { richColors: true, description: data.message || "An error occured!" })
            } else {
                setData(prevData =>
                    prevData?.map(driver =>
                        driver.Name === updateDriverId ? { ...driver, ...data.updateDriver } : driver
                    )
                )
                toast.success(data.message, { richColors: true })
            }
        } catch (err) {
            console.error(err)
            toast.error("Error marking as keypad user.", {
                description: typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code) : String(err),
                richColors: true
            })
        } finally {
            setLoading(false)
        }
    }

    const deleteSignupRequest = async (id: string) => {
        try {
            const response = await fetch(`${BASE_URL}/auth/driver/signup-request/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const responseData = await response.json();

            if (!response.ok) {
                toast.error("Error!", {
                    description: responseData.message,
                    richColors: true
                })
            } else {
                toast.success("Success", { description: responseData.message, richColors: true })
            }
        } catch (err) {
            toast.error("An error occured", {
                description: typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code) : String(err),
                richColors: true
            })
        } finally {
            setLoading(false)
        }
    }

    const createDriverAccount = async () => {
        setLoading(true)
        const bodyData = {
            password: updateValue,
            name: driverId,
            deviceUUID: signupRequests?.find((req) => req._id == updateDriverId)?.deviceUUID,
            phoneNumber: signupRequests?.find((req) => req._id == updateDriverId)?.phoneNumber,
            pushToken: signupRequests?.find((req) => req._id == updateDriverId)?.pushToken,
            requestId: signupRequests?.find((req) => req._id == updateDriverId)?._id,
        }
        try {
            const response = await fetch(`${BASE_URL}/auth/driver/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyData),
            });
            const responseData = await response.json();

            if (!response.ok) {
                toast.error("Error!", {
                    description: responseData.message,
                    richColors: true
                })
            } else {
                toast.success("Success", { description: responseData.message, richColors: true })
            }
        } catch (err) {
            toast.error("An error occured", {
                description: typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code) : String(err),
                richColors: true
            })
        } finally {
            setLoading(false)
        }
    }

    const searchDriver = async (idNumber: string) => {
        setLoading(true);
        try {
            const drivers = await searchItems<Driver>({
                url: `${BASE_URL}/searchDriver`,
                searchTerm: idNumber,
                errorMessage: 'No driver found with the given ID'
            });
            if (drivers.length > 0) {
                setSearchModalConfig({
                    isOpen: true,
                    title: "Select a Driver",
                    items: drivers,
                    onSelect: handleDriverSelection,
                    renderItem: (driver) => `${driver.Name}, ${driver.MobileNo.find((num: { LastUsed: boolean }) => num.LastUsed)?.MobileNo || "No Last Used Mobile No."}`,
                    keyExtractor: (driver) => driver.ITPLId || driver.Name,
                });
            }
        } catch (error) {
            console.error('Error searching for driver:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDriverSelection = async (driver: Driver) => {
        setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));

        if (driver) {
            setDriverId(driver.Name);
            const idMatch = driver.Name.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
            let cleanName = driver.Name.trim();
            let recognizedId = '';
            if (idMatch) {
                recognizedId = idMatch[0].replace(/[()]/g, '').toUpperCase();
                cleanName = cleanName.replace(/(?:\s*[-\s]\s*|\s*\(|\)\s*)(?:ITPL-?\d+|\(ITPL-?\d+\))/i, '').trim();
            }
            await findDriversVehicles(recognizedId || driver.ITPLId || cleanName)
            if (driver.password) {
                setAlreadyRegistered(true)
            }
        }
    }

    const handleUpdateTrip = async (vehiclNo: string, driver: string) => {
        setLoading(true);
        try {
            const result = await updateTripDriver(vehiclNo, driver)
            toast.success(result, { richColors: true })
            await findDriversVehicles(driver)
        } catch (error) {
            toast.error("An error Occured");
            return;
        } finally {
            setLoading(false);
        }
    }

    const redirectToChangePassword = () => {
        console.log('updateDriverID: ', updateDriverId)
        setUpdateDriverId(driverId);
        setParams(driverId);
        console.log('driverId: ', driverId)
        setUpdateType('Reset Password');
        setAlreadyRegistered(false)
    }

    return (
        <>
            {loading && <Loading />}
            <div className="p-4 flex flex-col gap-2">
                <h1 className="text-lg font-semibold">Manage Drivers</h1>
                <Input
                    className="sticky top-10"
                    type="string"
                    placeholder="Search..."
                    value={params}
                    onChange={(e) => setParams(e.target.value)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {signupRequests && signupRequests.length > 0 && signupRequests.map(requst => (
                        <Card key={requst._id}>
                            <CardContent>
                                <CardHeader>{requst.vehicleNo + ", " + requst.phoneNumber}</CardHeader>
                                <CardDescription className="flex flex-col gap-4">
                                    <span>
                                        <strong>Device Id: </strong>{requst.deviceUUID}
                                    </span>
                                    <span>
                                        <strong>Created at: </strong>{formatDate(requst.generationTime)}
                                    </span>
                                </CardDescription>
                                <CardFooter className="mt-4 grid grid-cols-2 gap-2">
                                    <Button onClick={() => { setUpdateDriverId(requst._id); setUpdateType('Create Account'); setUpdateDialogOpen(true); }}>Create Account</Button>
                                    <Button variant="destructive" onClick={() => { const response = confirm("Do you really wish to delete this driver Id? This action can't be undone"); if (response) deleteSignupRequest(requst._id) }}>Delete</Button>
                                </CardFooter>
                            </CardContent>
                        </Card>
                    ))}
                    {data && data.map(card => (
                        <Card key={card._id}>
                            <CardContent>
                                <CardHeader>{card.Name}</CardHeader>
                                <CardDescription className="flex flex-col gap-4">
                                    <span>
                                        <strong>Mobile No: </strong>{card.MobileNo?.map(mobile => (
                                            mobile.MobileNo + ", "
                                        ))}
                                    </span>
                                    <span>
                                        <strong>Is Registered: </strong>{card.isRegistered ? "Yes" : "No"}
                                    </span>
                                    {card.isRegistered && <span>
                                        <strong>Is Blocked: </strong>{card.verified ? "No" : "Yes"}
                                    </span>}
                                    {!card.isRegistered && <span >
                                        <strong>Is Keypad: </strong>{card.keypad ? "Yes" : "No"}
                                    </span>
                                    }
                                </CardDescription>
                                <CardFooter className="mt-4 grid grid-cols-2 gap-2">
                                    {card.isRegistered && <Button onClick={() => { setUpdateDriverId(card.Name); setUpdateType('Reset Password'); setUpdateDialogOpen(true); }}>Reset Password</Button>}
                                    {!card.isRegistered && !card.keypad && <Button onClick={() => { markAsKeypadUser(card.Name) }}>Set as keypad</Button>}
                                    {card.verified && <Button onClick={() => blockDriver(card.Name)}>Block Driver</Button>}
                                    <Button onClick={() => { setUpdateDriverId(card.Name); setUpdateType('Change Phone No.'); setUpdateDialogOpen(true); }}>Change Phone No.</Button>
                                    {!card.verified && card.isRegistered && <Button onClick={() => unBlockDriver(card.Name)}>UnBlock</Button>}
                                    <Button variant="destructive" onClick={() => { const response = confirm("Do you really wish to delete this driver Id? This action can't be undone"); if (response) deleteDriver(card._id) }}>Delete</Button>
                                </CardFooter>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div >
            <AlertDialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogTitle>{updateType} {updateType !== "Create Account" ? "for " + data?.find((card) => card.Name == updateDriverId)?.Name : "for " + signupRequests?.find((request) => request._id == updateDriverId)?.phoneNumber}</AlertDialogTitle>
                    <AlertDialogDescription className="flex flex-col gap-2">
                        {alreadyRegistered &&
                            <>
                                <span className="text-red-500">Already Registered</span>
                                <Button onClick={() => redirectToChangePassword()}>Change Password</Button>
                            </>
                        }
                        {updateType == "Create Account" &&
                            <>
                                <Input
                                    className="text-foreground"
                                    placeholder="Enter Driver Id eg.: 00245"
                                    value={driverId}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setDriverId(value);
                                        const nativeEvent = e.nativeEvent as InputEvent;
                                        if (nativeEvent.inputType === "insertText" && e.currentTarget.value.length > 3) {
                                            searchDriver(value);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Backspace") {
                                            return;
                                        }
                                        if (e.key === 'Enter' && driverId.length > 3) {
                                            e.preventDefault();
                                            searchDriver(driverId);
                                        }
                                    }}
                                />
                                <span className="flex flex-row justify-between w-full">
                                    {driverVehicles && driverVehicles.length &&
                                        <span className="flex flex-col gap-1">
                                            {loading ? <Loader2 className="w-10 h-10 text-foreground animate-spin" />
                                                :
                                                driverVehicles?.map((vehicle) => vehicle)
                                            }
                                        </span>
                                    }
                                    {driverVehicles && <Button onClick={() => {
                                        const vehicleNumber = prompt("Enter Full Vehicle Number");
                                        if (!vehicleNumber) return
                                        handleUpdateTrip(vehicleNumber.toUpperCase(), driverId)
                                    }}>{driverVehicles.length ? "Change Vehicle" : "Add vehicle"}</Button>}
                                </span>
                            </>
                        }
                        <Input
                            className="text-foreground"
                            placeholder={updateType !== "Create Account" ? "Enter " + updateType.split(" ")[1] + " to update" : "Enter Password"}
                            value={updateValue}
                            onChange={(e) => setUpdateValue(e.target.value)}
                        />
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUpdateDialogOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { updateType !== "Create Account" ? updateDriverDetail() : createDriverAccount() }}>{updateType == "Create Account" ? "Create" : "Update"}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
