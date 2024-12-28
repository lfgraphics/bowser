"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, } from './ui/table';
import { Button, } from './ui/button'
import { Input } from './ui/input'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu"
import { Toaster } from "@/components/ui/toaster"
import { ArrowDown01, ArrowUp10, Check, Edit, X } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { TripSheet, Filters, Sort } from '@/types/index';
import { isAuthenticated } from '@/lib/auth';
import { BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AlertDialog, AlertDialogTrigger, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogContent } from '@radix-ui/react-alert-dialog';
import { AlertDialogHeader } from './ui/alert-dialog';


const TripSheetPage = () => {

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);

    const [sheets, setSheets] = useState<TripSheet[]>([]);
    const [filters, setFilters] = useState<Filters>({
        driverName: '',
        bowserRegNo: '',
        tripSheetId: '',
        unsettled: false,
    });
    const [searchParam, setSearchParam] = useState<string>('');
    const [sort, setSort] = useState<Sort>({ field: '', order: 'desc' });
    const [loading, setLoading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState<boolean>(false);
    const [settlment, setSettlment] = useState<boolean>(false);
    const [deletingSheetId, setDeletingSheetId] = useState<string>('');
    const { toast } = useToast();

    useEffect(() => {
        loadSheets();
    }, [searchParam, settlment]);

    const loadSheets = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/tripsheet/all`, {
                params: { searchParam, settlment },
            });
            setSheets(response.data);
            console.log(response.data);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load sheets', variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const postDispenses = async (sheetId: string) => {
        alert('This Funcitonality is nor avaliable for now')
    }

    const handleDelete = async () => {
        try {
            await axios.delete(`${BASE_URL}/tripSheet/delete/${deletingSheetId}`);
            setShowSuccessAlert(true);
            window.history.back()
        } catch (error) {
            console.error('Error deleting Trip Sheet:', error);
            alert(`Error deleting Trip Sheet: ${error}`);
        } finally {
            setShowDeleteDialog(false);
        }
    };

    const openDeleteDialogue = (sheetId: string) => {
        setDeletingSheetId(sheetId)
        setShowDeleteDialog(true)
    }

    return (
        <div className="bg-background p-6 text-foreground">
            <div className="flex justify-between items-start">
                <h1 className="mb-4 font-bold text-2xl">Trip Sheets</h1>
            </div>
            <Toaster />
            <div className="flex space-x-4 mb-4">
                {/* <Input
                    placeholder="Driver Name"
                    value={filters.driverName}
                    onChange={(e) => setFilters({ ...filters, driverName: e.target.value })}
                />
                <Input
                    placeholder="Bowser Reg No"
                    value={filters.bowserRegNo}
                    onChange={(e) => setFilters({ ...filters, bowserRegNo: e.target.value })}
                />
                <Input
                    placeholder="Trip Sheet ID"
                    value={filters.tripSheetId}
                    onChange={(e) => setFilters({ ...filters, tripSheetId: e.target.value })}
                /> */}
                <Input type='string' placeholder='Search...' value={searchParam} onChange={(e) => setSearchParam(e.target.value)} />
                <Select onValueChange={(value) => setSettlment(value === 'true')}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="false">All</SelectItem>
                            <SelectItem value="true">Unsettled</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <Table className="w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead>SN</TableHead>
                        <TableHead>Trip Sheet ID</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Created on</TableHead>
                        <TableHead>Settled on</TableHead>
                        <TableHead>Bowser Reg No</TableHead>
                        <TableHead>Driver Name</TableHead>
                        <TableHead>Driver Mobile</TableHead>
                        <TableHead>Loaded</TableHead>
                        <TableHead>Dispenses</TableHead>
                        <TableHead>Sold</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead>Verified</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={11} className="text-center">Loading...</TableCell>
                        </TableRow>
                    ) : sheets.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={11} className="text-center">No records found</TableCell>
                        </TableRow>
                    ) : (
                        sheets.map((sheet, index) => (
                            <TableRow key={sheet._id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                    <Link href={`/dispense-records?tripNumber=${sheet.tripSheetId}`} className='text-blue-500 underline'>
                                        {sheet.tripSheetId}
                                    </Link>
                                </TableCell>
                                <TableCell>{sheet.fuelingAreaDestination}</TableCell>
                                <TableCell>{`${formatDate(sheet.tripSheetGenerationDateTime ? sheet.tripSheetGenerationDateTime : sheet.createdAt)}`}</TableCell>
                                <TableCell>{`${sheet.settelment?.dateTime !== undefined ? formatDate(sheet.settelment.dateTime) : "Un Settled"}`}</TableCell>
                                <TableCell>{sheet.bowser.regNo}</TableCell>
                                <TableCell>{sheet.bowser.driver?.length > 0 ? sheet.bowser.driver[0]?.name : "Old Data is not captured"}</TableCell>
                                <TableCell>{sheet.bowser.driver?.length > 0 ? sheet.bowser.driver[0]?.phoneNo : "Old Data is not captured"}</TableCell>
                                <TableCell>{sheet.totalLoadQuantity?.toFixed(2)}</TableCell>
                                <TableCell>{sheet.dispenses?.length || "0"}</TableCell>
                                <TableCell>{sheet.saleQty?.toFixed(2)}</TableCell>
                                <TableCell>{sheet.balanceQty?.toFixed(2)}</TableCell>
                                <TableCell className="flex space-x-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger>
                                            <Button variant="outline" className='w-full text-center'>
                                                Update
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className='bg-card'>
                                            <DropdownMenuItem>
                                                <Button variant="outline" className='w-full text-center'>
                                                    <Link href={`/tripsheets/settle/${sheet._id}`}>Settle</Link>
                                                </Button>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Button disabled variant="outline" className='w-full text-center'>
                                                    <Link href={`/tripsheets/addition/${sheet._id}`}>Reload (+)</Link>
                                                </Button>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Button disabled variant="outline" className='w-full text-center'>
                                                    <Link href={`/tripsheets/add-driver/${sheet._id}`}>Add Driver</Link>
                                                </Button>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Button disabled={sheet.dispenses && sheet.dispenses.length > 0 && sheet.dispenses.every(dispense => dispense.isVerified) ? false : true} variant="outline" className='w-full text-center' onClick={() => postDispenses(sheet._id!)}>Post</Button>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Button disabled className='w-full' variant="destructive" onClick={() => openDeleteDialogue(sheet._id!)}>Delete</Button>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                <TableCell>{sheet.dispenses && sheet.dispenses.length > 0 && sheet.dispenses.every(dispense => dispense.isVerified) ? <Check /> : (sheet.dispenses && sheet.dispenses.length > 0 ? <X /> : null)}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            {
                showDeleteDialog && deletingSheetId && (
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this trip sheet? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogAction onClick={() => handleDelete()}>Delete</AlertDialogAction>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                        </AlertDialogContent>
                    </AlertDialog>
                )
            }
            {
                showSuccessAlert && (
                    <AlertDialog open={showSuccessAlert} onOpenChange={setShowSuccessAlert}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Success!</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Operation completed successfully.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogAction onClick={() => setShowSuccessAlert(false)}>Close</AlertDialogAction>
                        </AlertDialogContent>
                    </AlertDialog>
                )
            }
        </div >
    );
};

export default TripSheetPage;
