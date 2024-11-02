"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { DispensesRecord } from "@/types";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { useRouter } from "next/dist/client/components/navigation";
import Loading from "../loading";

const VehicleDispensesPage = () => {
    const [records, setRecords] = useState<DispensesRecord[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [filter, setFilter] = useState({ bowserNumber: "", driverName: "" });
    const [sortBy, setSortBy] = useState("fuelingDateTime");
    const [order, setOrder] = useState("desc");
    const [localBowserNumber, setLocalBowserNumber] = useState("");
    const [localDriverName, setLocalDriverName] = useState("");
    const [limit, setLimit] = useState(20);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Authentication check
    useEffect(() => {
        checkAuth();
    }, [router]);

    // Fetch records when dependencies change
    useEffect(() => {
        fetchRecords();
    }, [currentPage, sortBy, order, filter, limit]);

    const checkAuth = async () => {
        setLoading(true);
        const authenticated = await isAuthenticated();
        if (!authenticated) {
            router.push('/login');
        }
        setLoading(false);
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const response = await axios.get("https://bowser-backend-2cdr.onrender.com/listDispenses", {
                params: {
                    page: currentPage,
                    limit: limit,
                    sortBy,
                    order,
                    bowserNumber: filter.bowserNumber,
                    driverName: filter.driverName,
                },
            });
            setRecords(response.data.records);
            setTotalPages(response.data.totalPages);
            setCurrentPage(response.data.currentPage);
            setTotalRecords(response.data.totalRecords);
        } catch (error) {
            console.error("Error fetching records:", error);
            alert(error)
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = async () => {
        setLoading(true);
        try {
            const date: Date = new Date();
            const options: Intl.DateTimeFormatOptions = {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata',
            };
            const timestamp: string = date.toLocaleDateString('en-IN', options);
            const filterDescription = `${filter.bowserNumber ? `Bowser-${filter.bowserNumber},` : ''}${filter.driverName ? `Driver-${filter.driverName},` : ''
                }`;
            const filename = `Dispenses_data ${filterDescription} ${records.length}records downloaded at ${timestamp}.xlsx`;

            const response = await axios.get("https://bowser-backend-2cdr.onrender.com/listDispenses/export/excel", {
                params: {
                    bowserNumber: filter.bowserNumber,
                    driverName: filter.driverName,
                    sortBy,
                    order,
                    limit,
                },
                responseType: "blob",
            });

            // Create a URL for the Blob and trigger the download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename); // Use the generated filename
            document.body.appendChild(link);
            link.click();
            link.remove(); // Clean up the link element
        } catch (error) {
            console.error("Error exporting data:", error);
            alert("Error exporting data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {(loading || records.length < 1) && (
                <Loading />
            )}

            <div className="mb-4 flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                <Input
                    placeholder="Filter by Bowser Number"
                    value={localBowserNumber}
                    onChange={(e) => setLocalBowserNumber(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            setFilter({ ...filter, bowserNumber: localBowserNumber });
                        }
                    }}
                    className="w-full sm:w-auto"
                />
                <Input
                    placeholder="Filter by Driver Name"
                    value={localDriverName}
                    onChange={(e) => setLocalDriverName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            setFilter({ ...filter, driverName: localDriverName });
                        }
                    }}
                    className="w-full sm:w-auto"
                />

                {/* Sort By Dropdown */}
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="flex items-center justify-between border rounded p-2">
                        <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="fuelingDateTime">Sort by Fueling Time</SelectItem>
                        <SelectItem value="vehicleNumber">Sort by Vehicle Number</SelectItem>
                        <SelectItem value="bowser.regNo">Sort by Bowser Number</SelectItem>
                    </SelectContent>
                </Select>

                {/* Order Dropdown */}
                <Select value={order} onValueChange={setOrder}>
                    <SelectTrigger className="flex items-center justify-between border rounded p-2">
                        <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                </Select>

            </div>

            <div className="mb-4 flex flex-col justify-between sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                <div className="flex items-center justify-between">Records limit <Input type="number" className="w-20 mx-4" value={limit} onChange={(e) => setLimit(Number(e.target.value))}></Input> </div>
                <div className="flex items-center justify-between text-gray-300 font-[200]">Total found record{records.length > 1 ? "s" : ""} {records.length} out of {totalRecords} records </div>
                <Button onClick={exportToExcel} className="w-full sm:w-auto">
                    Export to Excel
                </Button>
            </div>

            <Table>
                <TableCaption>A list of your recent Dispenses.</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Sr No</TableHead>
                        <TableHead>Fueling Time</TableHead>
                        <TableHead>Bowser Number</TableHead>
                        <TableHead>Bowser Location</TableHead>
                        <TableHead>Driver Name</TableHead>
                        <TableHead>Driver Mobile</TableHead>
                        <TableHead>Vehicle Number</TableHead>
                        <TableHead>Fuel Quantity</TableHead>
                        <TableHead>Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {records.map((record, index) => (
                        <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{record.fuelingDateTime}</TableCell>
                            <TableCell>{record.bowser.regNo}</TableCell>
                            <TableCell>{record.gpsLocation}</TableCell>
                            <TableCell>{record.driverName}</TableCell>
                            <TableCell>{record.driverMobile}</TableCell>
                            <TableCell>{record.vehicleNumber}</TableCell>
                            <TableCell>{record.quantityType} {record.fuelQuantity} L</TableCell>
                            <TableCell>
                                <Link href={`/dispense-records/${record._id}`}>
                                    <Button variant="outline" size="sm">
                                        View Details
                                    </Button>
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <div className="flex justify-between mt-4">
                <Button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <span>
                    Page {currentPage} of {totalPages}
                </span>
                <Button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};

export default VehicleDispensesPage;
