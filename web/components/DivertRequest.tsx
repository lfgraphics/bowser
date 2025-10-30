"use client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Allocator = { name: string; userId: string };

interface DivertRequestProps {
    allocators: Allocator[];
}

export default function DivertRequest({ allocators }: DivertRequestProps) {
    const [loading, setLoading] = useState(false);
    const [fromUser, setFromUser] = useState<string | null>(null);
    const [toUser, setToUser] = useState<string | null>(null);
    const [reason, setReason] = useState<string>("");
    const { toast } = useToast();

    const handleDivert = async () => {
        if (!fromUser || !toUser || !reason) {
            toast({ title: "Error", description: "Please select both users and enter a reason", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${BASE_URL}/request-transfer/create`, {
                by: fromUser,
                to: toUser,
                transferReason: reason,
                isAdmin: true,
            });
            if (response.status !== 200) {
                toast({ title: "Error", description: "Failed to divert requests", variant: "destructive" });
                console.error("Failed to divert requests:", response.data);
                return;
            }
            toast({ title: "Success", description: "Requests diverted successfully", variant: "success" });
            setFromUser(null);
            setToUser(null);
            setReason("");
        } catch (error) {
            console.error("Error diverting requests:", error);
            toast({ title: "Error", description: "Failed to divert requests", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // useEffect(() => {
    //     if (fromUser) {
    //         setUsers(allocators.filter((user) => user.userId !== fromUser));
    //     } else if (toUser) {
    //         setUsers(allocators.filter((user) => user.userId !== toUser));
    //     } else {
    //         setUsers(allocators);
    //     }
    // }, [fromUser, toUser, allocators]);

    return (
        <div className="admin-divert flex flex-col gap-2 p-4 border rounded">
            <h2 className="font-bold">Divert Requests</h2>
            <Label htmlFor="fromUser">Divert requests from</Label>
            <Select value={fromUser ?? undefined} onValueChange={setFromUser}>
                <SelectTrigger id="fromUser">
                    <SelectValue placeholder="Select user to divert from" />
                </SelectTrigger>
                <SelectContent>
                    {allocators.map((user) => (
                        <SelectItem key={user.userId} value={user.userId}>
                            {user.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Label htmlFor="toUser">Divert requests to</Label>
            <Select value={toUser ?? undefined} onValueChange={setToUser}>
                <SelectTrigger id="toUser">
                    <SelectValue placeholder="Select user to divert to" />
                </SelectTrigger>
                <SelectContent>
                    {allocators.map((user) => (
                        <SelectItem key={user.userId} value={user.userId}>
                            {user.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Label htmlFor="divertReason">Reason</Label>
            <Input
                id="divertReason"
                placeholder="Enter reason for divert"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
            />
            <Button className="w-full" disabled={loading} onClick={handleDivert}>
                {loading ? "Diverting..." : "Divert"}
            </Button>
        </div>
    );
}