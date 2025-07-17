"use client"
import { BASE_URL } from "@/lib/api";
import { Driver, SignUpRequests } from "@/types"
import { useCallback, useEffect, useState } from "react"
import Loading from "../loading";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { debounce, updateDriverMobile } from "@/utils";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

const page = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<Driver[]>();
    const [signupRequests, setSignupRequests] = useState<SignUpRequests[]>();
    const [updateDriverId, setUpdateDriverId] = useState<string>('');
    const [driverId, setDriverId] = useState<string>('');
    const [updateType, setUpdateType] = useState<'Reset Password' | 'Change Phone No.' | 'Create Account' | ''>('');
    const [updateValue, setUpdateValue] = useState<string>('');
    const [params, setParams] = useState<string>('');
    const [updateDialogOpen, setUpdateDialogOpen] = useState<boolean>(false);

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

    const debouncedDrivers = useCallback(debounce(fetchData, 3000), [params]);

    useEffect(() => {
        debouncedDrivers()
    }, [params])

    const deleteDriver = async (id: string) => {
        setLoading(true)
        try {
            let response = await fetch(`${BASE_URL}/tanker-drivers/${id}`, {
                method: "DELETE"
            });
            const jsonResponse = await response.json();
            if (!response.ok) {
                console.log(jsonResponse)
                toast.error(String(jsonResponse))
            }
            toast.success("Deleted Successfully");
        } catch (err) {
            console.log(err);
            toast.error("failed to delted, got some error");
        } finally {
            setLoading(false)
        }
    }

    const updateDriverDetail = async () => {
        setLoading(true)
        const updatingDriverId = data?.find((driver) => driver._id == updateDriverId)?.Name
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
                            driver._id === updateDriverId ? { ...driver, ...jsonResponse.updateDriver } : driver
                        )
                    )
                    toast.success(jsonResponse.message, { richColors: true });
                }
            } catch (error) {
                toast.error("Failed to update driver mobile number. Please try again.", { richColors: true, description: String(error) });
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
                        driver._id === updateDriverId ? { ...driver, ...data.updateDriver } : driver
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
                        driver._id === updateDriverId ? { ...driver, ...data.updateDriver } : driver
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
                        driver._id === updateDriverId ? { ...driver, ...data.updateDriver } : driver
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
        }
    }

    const deleteSignupRequest = async (id: string) => {

    }

    const createDriverAccount = async () => {
        setLoading(true)
        const bodyData = {
            password: updateValue,
            name: driverId,
            deviceUUID: signupRequests?.find((req) => req._id == updateDriverId)?.deviceUUID,
            phoneNumber: signupRequests?.find((req) => req._id == updateDriverId)?.phoneNumber,
            pushToken: signupRequests?.find((req) => req._id == updateDriverId)?.pushToken,
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

    return (
        <>
            {loading && <Loading />}
            <Toaster />
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
                                <CardHeader>{requst.phoneNumber}</CardHeader>
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
                                    {card.isRegistered && <Button onClick={() => { setUpdateDriverId(card._id); setUpdateType('Reset Password'); setUpdateDialogOpen(true); }}>Reset Password</Button>}
                                    {!card.isRegistered && !card.keypad && <Button onClick={() => { markAsKeypadUser(card._id) }}>Set as keypad</Button>}
                                    {card.verified && <Button onClick={() => blockDriver(card._id)}>Block Driver</Button>}
                                    <Button onClick={() => { setUpdateDriverId(card._id); setUpdateType('Change Phone No.'); setUpdateDialogOpen(true); }}>Change Phone No.</Button>
                                    {!card.verified && card.isRegistered && <Button onClick={() => unBlockDriver(card._id)}>UnBlock</Button>}
                                    <Button variant="destructive" onClick={() => { const response = confirm("Do you really wish to delete this driver Id? This action can't be undone"); if (response) deleteDriver(card._id) }}>Delete</Button>
                                </CardFooter>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div >
            <AlertDialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogTitle>{updateType} {updateType !== "Create Account" ? "for" + data?.find((card) => card._id == updateDriverId)?.Name : "for " + signupRequests?.find((request) => request._id == updateDriverId)?.phoneNumber}</AlertDialogTitle>
                    <AlertDialogDescription className="flex flex-col gap-2">
                        {updateType == "Create Account" &&
                            <Input
                                placeholder="Enter Driver Id eg.: 00245"
                                value={driverId}
                                onChange={(e) => setDriverId(e.target.value)}
                            />
                        }
                        <Input
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
        </>
    )
}

export default page
