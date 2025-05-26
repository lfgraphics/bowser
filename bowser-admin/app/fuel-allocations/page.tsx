"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FuelingOrder, User } from "@/types";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { isAuthenticated } from "@/lib/auth";
import Loading from "../loading";
import { Check, X } from "lucide-react";
import { BASE_URL } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogCancel, AlertDialogDescription, AlertDialogAction } from "@/components/ui/alert-dialog";

const Allocations = ({ searchParams }: { searchParams: { tripNumber?: number, allocator: string } }) => {
    const [allocators, setAllocators] = useState<{ name: string; userId: string }[]>([]);
    const [selectedAllocator, setSelectedAllocator] = useState<string | null>(null);
    const [filter, setFilter] = useState({ bowserNumber: "", driverName: "", tripSheetId: Number(searchParams.tripNumber), vehicleNo: "" });
    const [records, setRecords] = useState<FuelingOrder[]>([]);
    const [deleteRecord, setDeleteRecord] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [category, setCategory] = useState('all');
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
        if (user && (user.roles[0] !== 'Admin' && user.roles[1] !== 'Admin')) {
            window.history.back();
        }
    };
    useEffect(() => {
        setUser(JSON.parse(localStorage.getItem('adminUser')!))
        checkAuth();
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [currentPage, sortBy, order, filter, limit, verificationStatus, category, selectedAllocator, searchParams]);

    useEffect(() => {
        fetchAllocators();
    }, []);

    const fetchAllocators = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/users/allocators`);
            setAllocators(response.data);
        } catch (error) {
            console.error("Error fetching allocators:", error);
        }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            let params = {
                allocator: selectedAllocator,
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
            const response = await axios.get(`${BASE_URL}/listAllocations`, { params });
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

    const deleteAllocation = async () => {
        setLoading(true);
        try {
            const response = await axios.delete(`${BASE_URL}/listAllocations/delete/${deleteRecord}`);
            toast({ title: "Allocation Deleted", description: response.data.message, duration: 2000 });
            setShowDeleteDialog(false);
            setRecords(prevRecords => prevRecords.filter(record => record._id !== deleteRecord));
        } catch (error) {
            console.error("Error deleting allocation:", error);
            alert(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter({ ...filter, [e.target.name]: e.target.value });
    };

    return (
        <div>
            {loading && <Loading />}
            <Toaster />
            <div className="flex justify-between items-start pt-8">
                <h1 className="mb-4 font-bold text-2xl">Bowser Allocations</h1>
            </div>
            <div className="flex gap-4 mb-4">
                {/* Allocator Filter */}
                <Select onValueChange={(value) => setSelectedAllocator(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Vehicle Manager" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="undefined">All</SelectItem>
                        {allocators.map((allocator) => (
                            <SelectItem key={allocator.userId} value={allocator.userId}>
                                {allocator.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Bowser Number Filter */}
                <Input
                    name="bowserNumber"
                    placeholder="Bowser Number"
                    value={filter.bowserNumber}
                    onChange={handleFilterChange}
                />

                {/* Driver Name Filter */}
                <Input
                    name="driverName"
                    placeholder="Driver Name"
                    value={filter.driverName}
                    onChange={handleFilterChange}
                />

                {/* Vehicle Number Filter */}
                <Input
                    name="vehicleNo"
                    placeholder="Vehicle Number"
                    value={filter.vehicleNo}
                    onChange={handleFilterChange}
                />
            </div>

            <Table className="w-max min-w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead>S N</TableHead>
                        <TableHead>Order Time</TableHead>
                        <TableHead>Allocator</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Party/Vendor</TableHead>
                        <TableHead>Vehicle No</TableHead>
                        <TableHead>Driver/Manager</TableHead>
                        <TableHead>Phone No.</TableHead>
                        <TableHead>Qty Type</TableHead>
                        <TableHead>Fuel Qty</TableHead>
                        <TableHead>Bowser No.</TableHead>
                        <TableHead>Bowser Driver</TableHead>
                        <TableHead>Fulfilled</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="h-[50%] overflow-y-scroll">
                    {records.length > 0 && records.map((record, index) => (
                        <TableRow
                            key={index}
                            className={selectedRows.has(`${record._id}`) ? "bg-blue-200 hover:bg-blue-100 text-black" : ""}
                        >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{`${formatDate(record.createdAt)}`}</TableCell>
                            <TableCell>{record.allocationAdmin.name}</TableCell>
                            <TableCell>{record.category}</TableCell>
                            <TableCell>{record.party}</TableCell>
                            <TableCell>{record.vehicleNumber}</TableCell>
                            <TableCell>{record.driverName}</TableCell>
                            <TableCell>{record.driverMobile}</TableCell>
                            <TableCell>{record.quantityType}</TableCell>
                            <TableCell>{record.fuelQuantity}</TableCell>
                            <TableCell>{record.bowser.regNo || record.fuelProvider}</TableCell>
                            <TableCell>{record.bowser.driver.name || record.pumpLocation}</TableCell>
                            <TableCell>{record.fulfilled ? <Check className='text-green-500'/> : <X  className='text-red-500'/>}</TableCell>
                            <TableCell className="text-center"><Button variant="destructive" onClick={() => { setDeleteRecord(record._id); setShowDeleteDialog(true) }}>Delete</Button></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableCaption>
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
                </TableCaption>
            </Table>

            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>Confirm</AlertDialogHeader>
                    <AlertDialogDescription>
                        Are you sure to wan to delete the allocation with id {deleteRecord}
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={()=> deleteAllocation()}>Confirm Delete</AlertDialogAction>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

export default Allocations;
