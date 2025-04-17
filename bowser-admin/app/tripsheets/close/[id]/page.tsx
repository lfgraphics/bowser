"use client"
import Loading from '@/app/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BASE_URL } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { WholeTripSheet } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

const SettlementPage = ({ params }: { params: { id: string } }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [reason, setReason] = useState<string>("");
    const [remarks, setRemarks] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = "/login";
        }
        setLoading(false);
    };

    useEffect(() => {
        checkAuth();
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError(null);

        const storedUserJson = localStorage.getItem("adminUser");
        let userDetails = { id: "", name: "", phoneNumber: "" };
        if (storedUserJson) {
            const storedUser = JSON.parse(storedUserJson);
            userDetails = {
                id: storedUser.userId || "",
                name: storedUser.name || "",
                phoneNumber: storedUser.phoneNumber || "",
            };
        }

        const dateTime = new Date();

        try {
            const response = await axios.post(
                `${BASE_URL}/tripsheet/close-trip/${params.id}`,
                {
                    dateTime: String(dateTime),
                    userDetails,
                    reason,
                    remarks
                }
            );
            console.log(response);
            if (response.status === 200) {
                alert("Trip Closure submitted successfully!");
                handlePrint();
            }
        } catch (error) {
            console.error("Error submitting Trip Closure:", error);
            setError("Error submitting Trip Closure");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printURL = `${window.location.origin}/tripsheets/settle/print/${params.id}`; // Your print route
        const newWindow = window.open(printURL, "_blank");
        newWindow?.focus();

        setTimeout(() => {
            newWindow?.print();
        }, 3000);
    };

    return (
        <>
            <div className="flex flex-col gap-3 pt-8">
                {loading && <Loading />}
                <h1>closeing of TripSheet without settelment details</h1>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Closure</Label>
                        <Select
                            value={reason}
                            onValueChange={(value) => setReason(value)}
                        >
                            <SelectTrigger id="reason">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Accident">Accident</SelectItem>
                                <SelectItem value="Breakdown">Breakdown</SelectItem>
                                <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Input
                            id="remarks"
                            type="text"
                            placeholder="Enter remarks"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="mt-4">Submit Closure</Button>
                </form>
                {error && <div>{error}</div>}
            </div>
        </>
    );
};

export default SettlementPage;