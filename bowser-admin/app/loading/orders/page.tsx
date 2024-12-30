"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { DatePickerWithRange } from "@/components/DatePickerWithRange";
import { formatDate } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { BASE_URL } from "@/lib/api";
import Loading from "@/app/loading";
import { LoadingOrder } from "@/types";
import OnlyAllowed from "@/components/OnlyAllowed";

export default function LoadingOrdersPage() {
    const [orders, setOrders] = useState<LoadingOrder[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searchParam, setSearchParam] = useState("");
    const [loading, setLoading] = useState(false);

    // We'll store the selected date range from our custom date picker.
    // Note: The DatePickerWithRange already has internal state, 
    // but we expose the selected date range to the parent with onDateChange. 
    const [selectedRange, setSelectedRange] = useState<{
        from?: Date;
        to?: Date;
    }>({});

    // We'll trigger fetch on search or date range changes
    useEffect(() => {
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParam]);

    async function fetchOrders() {
        try {
            setLoading(true);
            setError(null); // reset any existing error

            const res = await fetch(`${BASE_URL}/loading/orders/get`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    startDate: selectedRange?.from ?? null,
                    endDate: selectedRange?.to ?? null,
                    searchParam,
                }),
            });

            // If the response isn't OK, handle it as an error
            if (!res.ok) {
                // You can read the error body:
                const errorData = await res.json();
                setError(errorData.error ?? "An unknown error occurred");
                setOrders([]); // ensure orders is empty
                return;
            }

            // Otherwise parse the data
            const data = await res.json();

            // If your server *always* returns an array on success
            // just set that array:
            if (Array.isArray(data)) {
                setOrders(data);
            } else {
                // If it's not an array, treat it as an error or unknown response
                setError("Server returned non-array data.");
                setOrders([]);
            }
        } catch (error: any) {
            console.error("Error fetching orders:", error);
            setError(error?.message ?? "Network error");
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-8 mx-auto py-8 container">
            {/* Page Heading */}
            <div className="flex justify-between items-center">
                <h1 className="font-bold text-2xl">Loading Orders</h1>
            </div>

            {/* Filter Controls */}
            <div className="flex md:flex-row flex-col items-start md:items-end md:space-x-4 space-y-4 md:space-y-0">
                {/* Search Input */}
                <div className="flex flex-col space-y-1">
                    <Label htmlFor="search">Search</Label>
                    <Input
                        id="search"
                        placeholder="Search by regNo or description..."
                        value={searchParam}
                        onChange={(e) => setSearchParam(e.target.value)}
                        className="md:w-72"
                    />
                </div>

                {/* Date Range Picker (custom) */}
                <div className="flex flex-col space-y-1">
                    <Label htmlFor="dateRange">Date Range</Label>
                    <DatePickerWithRange
                        onDateChange={(range: DateRange | undefined) => {
                            if (!range) {
                                // Reset only if it changed
                                if (selectedRange.from || selectedRange.to) {
                                    setSelectedRange({});
                                }
                                return;
                            }

                            // If from/to differ from our current state, then update
                            if (range.from?.getTime() !== selectedRange.from?.getTime() ||
                                range.to?.getTime() !== selectedRange.to?.getTime()) {
                                setSelectedRange({ from: range.from, to: range.to });
                            }
                        }}
                        className="w-full"
                    />
                </div>

                {/* Optionally, a manual "Apply Filter" button if you prefer not to auto-fetch */}
                <Button onClick={() => fetchOrders()}>Apply Filter</Button>
            </div>

            {/* Loading indicator */}
            {loading && <Loading />}
            {error && (
                <div className="text-red-600">
                    Error: {error}
                </div>
            )}

            {/* Orders Grid */}
            <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {/* Create New Order Card */}
                <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer"]}>
                    <Card>
                        <CardContent className="flex justify-center items-center h-full">
                            <Link href="/loading/orders/create">
                                <Button variant="outline" size="icon" className="p-10 rounded-full">
                                    <Plus className="scale-150" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </OnlyAllowed>
                {/* Render Filtered Orders */}
                {orders.length > 0 && orders.map((order) => (
                    <Link href={`/loading/sheet/${order._id}`} key={order._id}>
                        <Card
                            className={`cursor-pointer hover:bg-muted transition-colors ${order.fulfilled ? "bg-gray-100" : "bg-green-100"
                                }`}
                        >
                            <CardHeader>
                                <CardTitle className="font-semibold text-lg">
                                    {order.regNo}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm">
                                    <strong>Created: </strong>
                                    {formatDate(new Date(order.createdAt))}
                                </p>
                                <p className="text-sm">
                                    <strong>Officer: </strong>
                                    {order.bccAuthorizedOfficer.name}
                                </p>
                                {order.loadingDesc && (
                                    <p className="text-sm">
                                        <strong>Desc: </strong>
                                        {order.loadingDesc}
                                    </p>
                                )}
                                <p className="text-sm">
                                    <strong>Fulfilled: </strong>
                                    {order.fulfilled ? "Yes" : "No"}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
