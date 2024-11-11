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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import Loading from "../loading";

const VehicleDispensesPage = () => {
    const [records, setRecords] = useState<DispensesRecord[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [filter, setFilter] = useState({ bowserNumber: "", driverName: "", tripSheetId: "", verified: "all" });
    const [sortBy, setSortBy] = useState("fuelingDateTime");
    const [order, setOrder] = useState("desc");
    const [localBowserNumber, setLocalBowserNumber] = useState("");
    const [localDriverName, setLocalDriverName] = useState("");
    const [localTripSheetId, setLocalTripSheetId] = useState("");
    const [localVerified, setLocalVerified] = useState("");
    const [limit, setLimit] = useState(20);
    const [loading, setLoading] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState("all");

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [currentPage, sortBy, order, filter, limit, verificationStatus]);


    const fetchRecords = async () => {
        setLoading(true);
        try {
            // const dateFilter = getBackendDateFilter(); // Function to get the date range filter

            // let adjustedStartDate, adjustedEndDate;

            // if (selectedDateRange?.from) {
            //     // Set startDate to the beginning of the day
            //     adjustedStartDate = new Date(selectedDateRange.from);
            //     adjustedStartDate.setHours(0, 0, 0, 0);
            // }

            // if (selectedDateRange?.to) {
            //     // Set endDate to the end of the day
            //     adjustedEndDate = new Date(selectedDateRange.to);
            //     adjustedEndDate.setHours(23, 59, 59, 999);
            // }

            const response = await axios.get("https://bowser-backend-2cdr.onrender.com/listDispenses", { //https://bowser-backend-2cdr.onrender.com
                params: {
                    page: currentPage,
                    limit: limit,
                    sortBy,
                    order,
                    bowserNumber: filter.bowserNumber,
                    driverName: filter.driverName,
                    tripSheetId: filter.tripSheetId,
                    verified: verificationStatus,
                    // startDate: adjustedStartDate ? adjustedStartDate.toISOString() : undefined,
                    // endDate: adjustedEndDate ? adjustedEndDate.toISOString() : undefined,
                },
            });

            setRecords(response.data.records);
            setTotalPages(response.data.totalPages);
            setCurrentPage(response.data.currentPage);
            setTotalRecords(response.data.totalRecords);
        } catch (error) {
            console.error("Error fetching records:", error);
            alert(error);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = async () => {
        setLoading(true);
        try {
            const date = new Date();
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

            // const dateFilter = getBackendDateFilter(); // Function to get the date range filter

            // // Construct date description if date range is provided
            // const dateDescription = dateFilter
            //     ? `Date-${new Date(dateFilter.fuelingDateTime.$gte).toLocaleDateString()} to ${new Date(dateFilter.fuelingDateTime.$lte).toLocaleDateString()} ,`
            //     : '';
            const filterDescription = `${filter.bowserNumber ? `Bowser-${filter.bowserNumber} ,` : ''}${filter.driverName ? `Driver-${filter.driverName} ,` : ''}${filter.tripSheetId ? `Trip Sheet-${filter.tripSheetId} ,` : ''}`; //${selectedDateRange != undefined && dateDescription}`;
            const filename = `Dispenses_data ${filterDescription} ${records.length}record${records.length > 1 ? "s" : ""}, downloaded at ${timestamp}.xlsx`;

            const response = await axios.get("https://bowser-backend-2cdr.onrender.com/listDispenses/export/excel", {
                params: {
                    bowserNumber: filter.bowserNumber,
                    driverName: filter.driverName,
                    tripSheetId: filter.tripSheetId,
                    sortBy,
                    order,
                    limit,
                    // startDate: dateFilter?.fuelingDateTime.$gte, // Add startDate
                    // endDate: dateFilter?.fuelingDateTime.$lte, // Add endDate
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
            <div className="bigScreen hidden lg:block">
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
                    {/* <DatePickerWithRange onDateChange={handleDateChange} /> */}
                    <div className="flex items-center justify-between">
                        <Input
                            placeholder="Filter by Trip Sheet Id/ Number"
                            value={localTripSheetId}
                            onChange={(e) => setLocalTripSheetId(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    setFilter({ ...filter, tripSheetId: localTripSheetId });
                                }
                            }}
                            className="w-full sm:w-auto"
                        />
                    </div>
                    <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                        <SelectTrigger className="flex items-center justify-between border rounded p-2 w-[120px]">
                            <SelectValue placeholder="Verification Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="true">Verified</SelectItem>
                            <SelectItem value="false">Unverified</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between">Records limit <Input type="number" className="w-20 ml-4" value={limit} onChange={(e) => setLimit(Number(e.target.value))}></Input> </div>
                    <div className="flex items-center justify-between text-gray-300 font-[200]">Total found record{records.length > 1 ? "s" : ""} {records.length} out of {totalRecords} records </div>
                    <Button onClick={exportToExcel} className="w-full sm:w-auto">
                        Export to Excel
                    </Button>
                </div>
            </div>
            <Accordion type="single" collapsible className="block lg:hidden">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Filters and sorting</AccordionTrigger>
                    <AccordionContent>
                        <div className="mb-4 flex flex-col sm:flex-row flex-wrap sm:space-x-2 space-y-2 sm:space-y-0 w-screen">
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
                                <SelectTrigger className="flex items-center justify-between border rounded p-2 w-full self-center">
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
                                <SelectTrigger className="flex items-center justify-between border rounded p-2 w-full self-center">
                                    <SelectValue placeholder="Order" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="desc">Descending</SelectItem>
                                    <SelectItem value="asc">Ascending</SelectItem>
                                </SelectContent>
                            </Select>

                        </div>

                        <div className="mb-4 flex flex-col justify-between sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 flex-wrap">
                            {/* <DatePickerWithRange onDateChange={handleDateChange} /> */}
                            <div className="flex items-center justify-between">
                                <Input
                                    placeholder="Filter by Trip Sheet Id/ Number"
                                    value={localTripSheetId}
                                    onChange={(e) => setLocalTripSheetId(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            setFilter({ ...filter, tripSheetId: localTripSheetId });
                                        }
                                    }}
                                    className="w-full sm:w-auto"
                                />
                            </div>
                            <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                                <SelectTrigger className="flex items-center justify-between border rounded p-2 w-full self-center">
                                    <SelectValue placeholder="Verification Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="true">Verified</SelectItem>
                                    <SelectItem value="false">Unverified</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center justify-between">Records limit <Input type="number" className="w-20 mx-4" value={limit} onChange={(e) => setLimit(Number(e.target.value))}></Input> </div>
                            <div className="flex items-center justify-between text-gray-300 font-[200]">Total found record{records.length > 1 ? "s" : ""} {records.length} out of {totalRecords} records </div>
                            <Button onClick={exportToExcel} className="w-full sm:w-auto">
                                Export to Excel
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <Table>
                <TableCaption>A list of your recent Dispenses.</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Sr No</TableHead>
                        <TableHead>Trip Sheet Id/ Number</TableHead>
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
                    {records.length > 0 && records.map((record, index) => (
                        <TableRow key={index} className={`${record.verified ? "bg-green-200 hover:bg-green-50 text-background" : ""}`}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{record.tripSheetId}</TableCell>
                            <TableCell>{record.fuelingDateTime}</TableCell>
                            <TableCell>{record.bowser.regNo}</TableCell>
                            <TableCell>{record.gpsLocation.substring(0, 15) + "..."}</TableCell>
                            <TableCell>{record.driverName}</TableCell>
                            <TableCell>{record.driverMobile}</TableCell>
                            <TableCell>{record.vehicleNumber}</TableCell>
                            <TableCell>{record.quantityType} {record.fuelQuantity} L</TableCell>
                            <TableCell>
                                <Link href={`/dispense-records/${record._id}`}>
                                    <Button variant={`${record.verified ? "secondary" : "outline"}`} size="sm">
                                        View Details
                                    </Button>
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                    {/* Calculate total fuel quantity if filtered by tripSheetId */}
                    <TableRow>
                        <TableCell colSpan={8} className="text-right font-bold">Total Fuel Quantity:</TableCell>
                        <TableCell>
                            {records.reduce((total, record) => total + Number(record.fuelQuantity), 0)} L
                        </TableCell>
                        <TableCell className="text-right font-bold"></TableCell>
                    </TableRow>
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
