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
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
    const { toast } = useToast();

    useEffect(() => {
        const storedUser = localStorage.getItem('adminUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);
    const fetchAllocators = async () => {
        let url = user?.department ? `${BASE_URL}/users/allocators?department=${user?.department}` : `${BASE_URL}/users/allocators`;
        try {
            const response = await axios.get(url);
            setAllocators(response.data);
        } catch (error) {
            console.error("Error fetching allocators:", error);
            toast({ title: 'Error fetching allocators', description: error instanceof Error ? error.message : 'An error occurred', variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    };
    const createRequestTransferRequest = async () => {
        if (!user) return;
        if (!user.userId) {
            toast({ title: 'Error', description: 'User not found', variant: "destructive" });
            return;
        }
        if (!selectedAllocator) {
            toast({ title: 'Error', description: 'Please select a recipient', variant: "destructive" });
            return;
        }
        if (!transferReason) {
            toast({ title: 'Error', description: 'Please enter a reason', variant: "destructive" });
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
                toast({ title: 'Error', description: 'Failed to create request transfer', variant: "destructive" });
                return;
            }
            toast({ title: 'Success', description: 'Operation Successful, wait for the recipient to response', variant: "success" });
        } catch (error) {
            console.error("Error fetching allocators:", error);
        } finally {
            setLoading(false);
        }
    };
    const fetchRequestsByMe = async (user: User) => {
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
            toast({ title: 'Error', description: 'Please enter a reason to cancel/reject this request ', variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const response = await axios.patch(`${BASE_URL}/request-transfer/reject/${cancellation.id}`, {
                by: user.userId,
                reason: cancellation.reason
            });
            if (response.status !== 200) {
                toast({ title: 'Error', description: 'Failed to cancel request transfer', variant: "destructive" });
                return;
            }
            toast({ title: 'Success', description: 'Request cancelled', variant: "success" });
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
                toast({ title: 'Error', description: 'Failed to accept request transfer', variant: "destructive" });
                return;
            }
            toast({ title: 'Success', description: `Request accepted\nYou'll recieve all of his fuel request instead of him`, variant: "success" });
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
                toast({ title: 'Error', description: 'Failed to mark as fulfilled this request transfer', variant: "destructive" });
                return;
            }
            const request = [...requestsByMe, ...requestsToMe].find(r => r._id === id);
            toast({ title: 'Success', description: `Request marked as fulfilled\nNow ${request?.by} will receive their fuel requests`, variant: "success" });
        } catch (error) {
            console.error("Error fetching allocators:", error);
        } finally {
            setLoading(false);
            setOpenCancellationDialog(false);
        }
    }
    useEffect(() => {
        const storedUser = localStorage.getItem('adminUser');
        fetchAllocators();
        fetchRequestsByMe(storedUser ? JSON.parse(storedUser) : null);
        fetchRequestsToMe();
    }, []);

    return (
        <>
            {loading && <Loading />}
            <Toaster />
            <main className="mt-6">
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
                                    <SelectItem key={allocator.userId} value={allocator.name}>
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
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requestsByMe.map((request, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{formatDate(request.generationTime)}</TableCell>
                                            <TableCell>{request.to}</TableCell>
                                            <TableCell>{request.transferReason}</TableCell>
                                            <TableCell>{request.accepted ? "Accepted" : request.cancellation?.reason ? `Cancelled or Rejected. By: ${request.cancellation.by} Reason: ${request.cancellation?.reason}` : request.fulfilled ? "Request Fulfilled" : `Pending.\nWait for the recipients response.`}</TableCell>
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
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requestsToMe.map((request, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{formatDate(request.generationTime)}</TableCell>
                                            <TableCell>{request.by}</TableCell>
                                            <TableCell>{request.transferReason}</TableCell>
                                            <TableCell>{request.accepted ? "Accepted" : request.cancellation?.reason ? `Cancelled or Rejected. By: ${request.cancellation.by} Reason: ${request.cancellation?.reason}` : request.fulfilled ? "Request Fulfilled" : "Pending.\nWait for the recipients response."}</TableCell>
                                            <TableCell>
                                                {!request.accepted && !request.cancellation && !request.fulfilled && <Button onClick={() => confirm(`Are you sure to want to accept fuel requests transfer to you\nAfter confirming You will get all fueling requests of ${request.by} too`) && acceptRequest}>Accept</Button>}
                                                {!request.accepted && !request.cancellation && !request.fulfilled && <Button onClick={() => { setOpenCancellationDialog(true); setCancellation({ id: request._id, reason: '' }) }}>Reject</Button>}
                                                {request.accepted && <Button onClick={() => confirm('Are you sure to mark this request as fulfilled?') && markFulfilled(request._id)}>Mark fulfilled</Button>}
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
        </>
    )
}