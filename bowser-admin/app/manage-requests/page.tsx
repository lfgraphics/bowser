"use client"
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { BASE_URL } from "@/lib/api";
import { User } from "@/types/auth";
import { TransferRequest } from "@/types";
import Loading from "@/app/loading";

export default function FuelRequestTransfer() {
    const [loading, setLoading] = useState(false);
    const [allocators, setAllocators] = useState<{ name: string; userId: string }[]>([]);
    const [selectedAllocator, setSelectedAllocator] = useState<string | null>(null);
    const [requestsByMe, setRequestsByMe] = useState<TransferRequest[]>([]);
    const [requestsToMe, setRequestsToMe] = useState<TransferRequest[]>([]);
    const [user, setUser] = useState<User>()

    useEffect(() => {
        const storedUser = localStorage.getItem('adminUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);
    const fetchAllocators = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/users/allocators`);
            setAllocators(response.data);
        } catch (error) {
            console.error("Error fetching allocators:", error);
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
    useEffect(() => {
        fetchAllocators();
        fetchRequestsByMe();
        fetchRequestsToMe();
    }, []);

    return (
        <>
            {loading && <Loading />}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="transfer">
                    <Label htmlFor="allocatorsSelect">Transfer to</Label>
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
                </div>
                <div className="accept">
                    list of requests
                </div>
            </div>
        </>
    )
}