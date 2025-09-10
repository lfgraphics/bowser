"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FuelingOrder, User } from "@/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { isAuthenticated } from "@/lib/auth";
import Loading from "../loading";
import { Check, CheckCheck, X } from "lucide-react";
import { BASE_URL } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const VehicleDispensesPage = ({ searchParams }: { searchParams: { tripNumber?: number, allocator: string } }) => {
    const tripNumber = searchParams.tripNumber;
    const allocator = searchParams.allocator;

    const [records, setRecords] = useState<FuelingOrder[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [category, setCategory] = useState('all');
    const [filter, setFilter] = useState({ bowserNumber: "", driverName: "", tripSheetId: Number(tripNumber), verified: "all", vehicleNo: "" });
    const [sortBy, setSortBy] = useState("createdAt");
    const [order, setOrder] = useState("desc");
    const [limit, setLimit] = useState(20);
    const [loading, setLoading] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState("all");
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [user, setUser] = useState<User>()
    const { toast } = useToast();

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
        setUser(JSON.parse(localStorage.getItem('adminUser')!))
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [currentPage, sortBy, order, filter, limit, verificationStatus, category, searchParams]);


    const fetchRecords = async () => {
        setLoading(true);
        try {
            let params = {
                allocator,
                page: currentPage,
                limit: limit,
                sortBy,
                order,
                bowserNumber: filter.bowserNumber,
                driverName: filter.driverName,
                tripSheetId: Number(filter.tripSheetId) || null,
                vehicleNo: filter.vehicleNo,
                verified: verificationStatus,
                category,
            };
            console.log('params: ', params)
            const response = await axios.get(`${BASE_URL}/listAllocations`, { params: params });
            console.log('records: ', response.data.records)

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
    // Function to toggle selection of a row
    const toggleRowSelection = (id: string) => {
        setSelectedRows((prev) => {
            const newSelectedRows = new Set(prev);
            if (newSelectedRows.has(id)) {
                newSelectedRows.delete(id); // Deselect if already selected
            } else {
                newSelectedRows.add(id); // Select if not selected
            }
            return newSelectedRows;
        });
    };

    const deleteAllocation = (id: string) => async () => {
        const confirmation = confirm("Are you sure you want to delete this allocation?");
        if (!confirmation) return;

        try {
            const response = await axios.delete(`${BASE_URL}/listAllocations/delete/${id}`);
            if (response.status === 200) {
                toast({
                    title: "Success",
                    description: "Allocation deleted successfully.",
                    variant: "success",
                });
                setRecords(records.filter(record => record._id !== id));
                setSelectedRows(new Set());
            }
        } catch (error) {
            console.error("Error deleting allocation:", error);
            toast({
                title: "Error",
                description: "Failed to delete allocation.",
                variant: "destructive",
            });
        }
    }

    return (
        <div className="relative">
            {(loading || records.length < 1) && (
                <Loading />
            )}
            <Toaster />
            <div className="flex justify-between items-start pt-8">
                <h1 className="mb-4 font-bold text-2xl">Your Allocations</h1>
            </div>

            <Table className="w-max min-w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead>S N</TableHead>
                        <TableHead>Order Time</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Party/Vendor</TableHead>
                        <TableHead>Vehicle No</TableHead>
                        <TableHead>Driver/Manager</TableHead>
                        <TableHead>Phone No.</TableHead>
                        <TableHead>Qty Type</TableHead>
                        <TableHead>Fuel Qty</TableHead>
                        <TableHead>Bowser No.</TableHead>
                        <TableHead>Bowser Driver</TableHead>
                        <TableHead>Seen</TableHead>
                        <TableHead>Fulfilled</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="h-[50%] overflow-y-scroll">
                    {records.length > 0 && records.map((record, index) => (
                        <TableRow
                            key={index}
                            onClick={(e: React.MouseEvent<HTMLElement>) => {
                                const target = e.target as HTMLElement;
                                if (target.tagName !== 'BUTTON') {
                                    toggleRowSelection(`${record._id}`);
                                }
                            }}
                            className={selectedRows.has(`${record._id}`) ? "bg-blue-200 hover:bg-blue-100 text-black" : ""}
                        >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{`${formatDate(record.createdAt)}`}</TableCell>
                            <TableCell>{record.category}</TableCell>
                            <TableCell>{record.category !== "Own" ? record.party : "Not Applicable"}</TableCell>
                            <TableCell>{record.vehicleNumber}</TableCell>
                            <TableCell>{record.driverName}</TableCell>
                            <TableCell>{record.driverMobile}</TableCell>
                            <TableCell>{record.quantityType}</TableCell>
                            <TableCell>{record.fuelQuantity}</TableCell>
                            <TableCell>{record.bowser.regNo}</TableCell>
                            <TableCell>{record.bowser.driver.name}</TableCell>
                            <TableCell>{record.seen ? <CheckCheck className="text-blue-500" /> : <CheckCheck className="text-gray-500" />}</TableCell>
                            <TableCell>{record.fulfilled ? <Check className="text-green-500" /> : <X className="text-red-500" />}</TableCell>
                            <TableCell className="flex gap-2">
                                <Link href={{
                                    pathname: '/dashboard',
                                    query: {
                                        orderId: record._id,
                                        category: record.category,
                                        party: record.party,
                                        partyName: record.partyName,
                                        tripId: record.tripId,
                                        vehicleNumber: record.vehicleNumber,
                                        odometer: record.odometer,
                                        driverId: record.driverId,
                                        driverName: record.driverName,
                                        driverMobile: record.driverMobile,
                                        quantityType: record.quantityType,
                                        fuelQuantity: record.fuelQuantity,
                                        pumpAllocationType: record.pumpAllocationType,
                                        allocationType: record.allocationType,
                                        bowserDriverName: record.bowser.driver.name,
                                        bowserDriverMobile: record.bowser.driver.phoneNo,
                                        bowserRegNo: record.bowser.regNo,
                                        fuelProvider: record.fuelProvider,
                                        petrolPump: record.petrolPump,
                                        editing: true,
                                    }
                                }}>
                                    <Button variant="default">Edit</Button>
                                </Link>
                                <Button variant="destructive" onClick={deleteAllocation(record._id)}>Delete</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div >
    );
};

export default VehicleDispensesPage;
