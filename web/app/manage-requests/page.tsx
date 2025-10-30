"use client"
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { BASE_URL } from "@/lib/api";
import { User } from "@/types/auth";
import { TransferRequest } from "@/types";
import Loading from "@/app/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import OnlyAllowed from "@/components/OnlyAllowed";
import DivertRequest from "@/components/DivertRequest";
import { toast } from "sonner";

export default function FuelRequestTransfer() {
    const [loading, setLoading] = useState(true);
    const [allocators, setAllocators] = useState<{ name: string; userId: string }[]>([]);
    const [transferReason, setTransferReason] = useState<string>("");
    const [selectedAllocator, setSelectedAllocator] = useState<string | null>(null);
    const [requestsByMe, setRequestsByMe] = useState<TransferRequest[]>([]);
    const [requestsToMe, setRequestsToMe] = useState<TransferRequest[]>([]);
    const [openCancellationDialog, setOpenCancellationDialog] = useState(false);
    const [cancellation, setCancellation] = useState<{ reason: string; id: string } | null>(null);
    const [user, setUser] = useState<User>()

    useEffect(() => {
        const storedUser = localStorage.getItem('adminUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);
    const fetchAllocators = async () => {
        if (!user) return;
        let url = user?.department ? `${BASE_URL}/users/allocators?department=${user?.department}` : `${BASE_URL}/users/allocators`;
        try {
            const response = await axios.get(url);
            setAllocators(response.data);
        } catch (error) {
            console.error("Error fetching allocators:", error);
            toast.error('Error fetching allocators', { description: error instanceof Error ? error.message : 'An error occurred', richColors: true });
        }
        finally {
            setLoading(false);
        }
    };
    const createRequestTransferRequest = async () => {
        if (!user) return;
        if (!user.userId) {
            toast.error('User Not found', { richColors: true });
            return;
        }
        if (!selectedAllocator) {
            toast.error('Please select a recipient', { richColors: true });
            return;
        }
        if (!transferReason) {
            toast.error('Please enter a reason', { richColors: true });
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${BASE_URL}/request-transfer/create`, {
                by: user.userId,
                to: selectedAllocator,
                transferReason
            });
            if (response.status !== 200) {
                toast.error('Failed to create request transfer', { richColors: true });
                return;
            }
            toast('Operation Successful, wait for the recipient to response', { richColors: true });
        } catch (error) {
            console.error("Error fetching allocators:", error);
        } finally {
            setLoading(false);
        }
    };
    const fetchRequestsByMe = async () => {
        if (!user) return;
        try {
            const response = await axios.get(`${BASE_URL}/request-transfer/yours/${user.userId}`);
            setRequestsByMe(response.data.requestTransfers);
        } catch (error) {
            console.error("Error fetching allocators:", error);
        }
    };
    const fetchRequestsToMe = async () => {
        if (!user) return;
        try {
            const response = await axios.get(`${BASE_URL}/request-transfer/to-you/${user.userId}`);
            setRequestsToMe(response.data.requestTransfers);
        } catch (error) {
            console.error("Error fetching allocators:", error);
        }
    };
    const cancel = async () => {
        if (!user) return;
        if (!cancellation?.reason) {
            toast('Please enter a reason to cancel/reject this request ', { richColors: true });
            return;
        }
        setLoading(true);
        try {
            const response = await axios.patch(`${BASE_URL}/request-transfer/reject/${cancellation.id}`, {
                by: user.userId,
                reason: cancellation.reason
            });
            if (response.status !== 200) {
                toast.error('Failed to cancel request transfer', { richColors: true });
                return;
            } else {
                toast.success('Request cancelled');
            }
        } catch (error) {
            console.error("Error fetching allocators:", error);
        } finally {
            setLoading(false);
            setOpenCancellationDialog(false);
        }
    }
    const acceptRequest = async (id: string) => {
        setLoading(true);
        try {
            const response = await axios.patch(`${BASE_URL}/request-transfer/accept/${id}`);
            if (response.status !== 200) {
                toast('Failed to accept request transfer', { richColors: true });
                return;
            } else {
                toast(`Request accepted\nYou'll recieve all of his fuel request instead of him`, { richColors: true });
            }
        } catch (error) {
            console.error("Error fetching allocators:", error);
        } finally {
            setLoading(false);
            setOpenCancellationDialog(false);
        }
    }
    const markFulfilled = async (id: string) => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/request-transfer/mark-fulfilled/${id}`);
            if (response.status !== 200) {
                toast.error('Failed to mark as fulfilled this request transfer', { richColors: true });
                return;
            }
            const request = [...requestsByMe, ...requestsToMe].find(r => r._id === id);
            toast.success('Success', { description: `Request marked as fulfilled\nNow ${request?.by} will receive their fuel requests`, richColors: true });
        } catch (error) {
            console.error("Error fetching allocators:", error);
        } finally {
            setLoading(false);
            setOpenCancellationDialog(false);
        }
    }
    useEffect(() => {
        fetchAllocators();
        fetchRequestsByMe();
        fetchRequestsToMe();
    }, [user]);

    return (
        <>
            {loading && <Loading />}
            <OnlyAllowed allowedRoles={["Diesel Control Center Staff"]}>
                <main className="my-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="transfer flex flex-col gap-2">
                            Create a request transfer
                            <Label htmlFor="allocatorsSelect">Chose the recipient</Label>
                            <Select onValueChange={(value) => setSelectedAllocator(value)}>
                                <SelectTrigger id="allocatorsSelect">
                                    <SelectValue placeholder="Choose the recipient of your request transfer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allocators.map((allocator) => (
                                        <SelectItem key={allocator.userId} value={allocator.userId}>
                                            {allocator.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Label htmlFor="reason">Transfer Reason </Label>
                            <Input id="reason" placeholder="Enter request transfer reason" type="string" value={transferReason} onChange={(e) => setTransferReason(e.target.value)}></Input>
                            <Button className="w-full" disabled={loading} onClick={() => createRequestTransferRequest()}>{loading ? "Submiting..." : "Submit"}</Button>
                        </div>
                        <div className="wait">
                            Your request transfer
                            {requestsByMe.length === 0 ? <p className="text-muted-foreground">You haven't created any request transfer yet</p> : (
                                <Table className="w-max min-w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sr No.</TableHead>
                                            <TableHead>Created at</TableHead>
                                            <TableHead>Transferred to</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-center">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {requestsByMe.map((request, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{formatDate(request.generationTime)}</TableCell>
                                                <TableCell>{request.to}</TableCell>
                                                <TableCell>{request.transferReason}</TableCell>
                                                <TableCell>{request.accepted ? "Accepted" : request.cancellation?.reason ? `${user?.userId == request.by ? "Cancelled" : "Rejected"} By: ${request.cancellation.by}, Reason: ${request.cancellation?.reason}` : request.fulfilled ? "Request Fulfilled" : `Pending.\nWait for the recipients response.`} {request.fulfilled ? "Fulfilled" : ""}</TableCell>
                                                <TableCell className="flex gap-2">
                                                    {!request.accepted && !request.cancellation && <Button onClick={() => { setOpenCancellationDialog(true); setCancellation({ id: request._id, reason: '' }) }}>Cancel</Button>}
                                                    {!request.cancellation && request.accepted && !request.fulfilled && <Button onClick={() => confirm('Are you sure to mark this request as fulfilled?') && markFulfilled(request._id)}>Mark fulfilled</Button>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                        <div className="accept">
                            Transfer requests to you
                            {requestsToMe.length === 0 ? <p className="text-muted-foreground">You don't have any requests transfer</p> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sr No.</TableHead>
                                            <TableHead>Created at</TableHead>
                                            <TableHead>Transferred from</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-center">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {requestsToMe.map((request, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{formatDate(request.generationTime)}</TableCell>
                                                <TableCell>{request.by}</TableCell>
                                                <TableCell>{request.transferReason}</TableCell>
                                                <TableCell>{request.accepted ? "Accepted" : request.cancellation?.reason ? `${user?.userId == request.by ? "Cancelled" : "Rejected"} By: ${request.cancellation.by}, Reason: ${request.cancellation?.reason}` : request.fulfilled ? "Request Fulfilled" : "Pending.\nWait for the recipients response."}{request.fulfilled ? " Fulfilled" : ""}</TableCell>
                                                <TableCell className="flex gap-2 justify-center">
                                                    {!request.accepted && !request.cancellation && !request.fulfilled && <Button onClick={() => { if (confirm(`Are you sure to want to accept fuel requests transfer to you\nAfter confirming You will get all fueling requests of ${request.by} too`)) { acceptRequest(request._id) } }}>Accept</Button>}
                                                    {!request.accepted && !request.cancellation && !request.fulfilled && <Button onClick={() => { setOpenCancellationDialog(true); setCancellation({ id: request._id, reason: '' }) }}>Reject</Button>}
                                                    {request.accepted && !request.fulfilled && <Button onClick={() => confirm('Are you sure to mark this request as fulfilled?') && markFulfilled(request._id)}>Mark fulfilled</Button>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                        <AlertDialog open={openCancellationDialog} onOpenChange={setOpenCancellationDialog}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure you want to cancel this request?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogDescription>
                                    <Input placeholder="Enter cancellation reason" type="string" value={cancellation?.reason} onChange={(e) => setCancellation(cancellation?.id ? { reason: e.target.value, id: cancellation.id } : null)}></Input>
                                </AlertDialogDescription>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={cancel}>Submit</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </main >
            </OnlyAllowed>

            <OnlyAllowed allowedRoles={["Admin"]}>
                <DivertRequest allocators={allocators}></DivertRequest>
            </OnlyAllowed>
        </>
    )
}