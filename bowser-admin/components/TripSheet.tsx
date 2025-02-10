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
import { Check, Eye, X } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { TripSheet } from '@/types/index';
import { isAuthenticated } from '@/lib/auth';
import { BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AlertDialog, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogContent } from '@/components/ui/alert-dialog';
import { AlertDialogHeader } from './ui/alert-dialog';
import OnlyAllowed from './OnlyAllowed';


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
    const [searchParam, setSearchParam] = useState<string>('');
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
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this trip sheet? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => handleDelete()}>Delete</AlertDialogAction>
                    <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
                </AlertDialogContent>
            </AlertDialog>
            <Table className="w-max min-w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead>SN</TableHead>
                        <TableHead>Trip Sheet ID</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Created on</TableHead>
                        <TableHead>Settled on</TableHead>
                        <TableHead>Bowser No.</TableHead>
                        <TableHead>Driver Name</TableHead>
                        <TableHead>Driver Mobile</TableHead>
                        <TableHead>Loaded</TableHead>
                        <TableHead>Dispenses</TableHead>
                        <TableHead>Sold</TableHead>
                        <TableHead>Balance</TableHead>
                        <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer"]}>
                            <TableHead className='text-center'>Actions</TableHead>
                        </OnlyAllowed>
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
                                <TableCell className='text-center'>
                                    <Link href={`/dispense-records?tripNumber=${sheet.tripSheetId}`} className='text-blue-500 underline'>
                                        {sheet.tripSheetId}
                                    </Link>
                                </TableCell>
                                <TableCell>{sheet.fuelingAreaDestination}</TableCell>
                                <TableCell>{`${formatDate(sheet.tripSheetGenerationDateTime ? sheet.tripSheetGenerationDateTime : sheet.createdAt)}`}</TableCell>
                                <TableCell>{`${sheet.settelment?.dateTime !== undefined ? formatDate(sheet.settelment.dateTime) : ""}`}</TableCell>
                                <TableCell>{sheet.bowser.regNo}</TableCell>
                                <TableCell>{sheet.bowser.driver?.length > 0 ? sheet.bowser.driver[0]?.name : ""}</TableCell>
                                <TableCell>{sheet.bowser.driver?.length > 0 ? sheet.bowser.driver[0]?.phoneNo : ""}</TableCell>
                                <TableCell>{sheet.totalLoadQuantityBySlip}</TableCell>
                                <TableCell className='text-center' >{sheet.dispenses?.length || "0"}</TableCell>
                                <TableCell>{sheet.saleQty?.toFixed(2)}</TableCell>
                                <TableCell>{(Number(sheet.totalLoadQuantityBySlip?.toFixed(2)) - Number(sheet.saleQty?.toFixed(2))).toFixed(2)}</TableCell>
                                <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer"]}>
                                    <TableCell className="flex justify-center gap-2 w-full">
                                        {sheet.settelment?.dateTime == undefined &&
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="lg" className='p-4 h-10 text-center'>
                                                        Update
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className='bg-card text-center'>
                                                    <Link className='items-center w-full text-center' href={sheet.settelment?.dateTime == undefined ? `/tripsheets/add-record/?tripSheetId=${sheet.tripSheetId}&bowser=${sheet.bowser.regNo}` : ``}>
                                                        <DropdownMenuItem disabled={sheet.settelment?.dateTime !== undefined} className='items-center p-4 w-full h-10'>
                                                            Add Record
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link className='items-center w-full text-center' href={sheet.settelment?.dateTime == undefined ? `/tripsheets/settle/${sheet._id}` : ``}>
                                                        <DropdownMenuItem disabled={sheet.settelment?.dateTime !== undefined} className='items-center p-4 w-full h-10'>
                                                            Settle
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link className='items-center w-full text-center' href={sheet.settelment?.dateTime == undefined ? `/tripsheets/addition/${sheet._id}?tripSheetId=${sheet.tripSheetId}` : ``}>
                                                        <DropdownMenuItem disabled={sheet.settelment?.dateTime !== undefined} className='items-center p-4 w-full h-10'>
                                                            Reload (+)
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link className='items-center w-full text-center' href={sheet.settelment?.dateTime == undefined ? `/tripsheets/add-driver/${sheet._id}` : ``}>
                                                        <DropdownMenuItem disabled={sheet.settelment?.dateTime !== undefined} className='items-center p-4 w-full h-10'>
                                                            Add Driver
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link className='items-center w-full text-center' href={`/tripsheets/${sheet._id}`}>
                                                        <DropdownMenuItem disabled={sheet.settelment?.dateTime !== undefined} className='items-center p-4 w-full h-10'>
                                                            <Eye />
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <DropdownMenuItem disabled={sheet.settelment?.dateTime == undefined && sheet.dispenses?.length > 0 && sheet.dispenses.every(dispense => dispense.verified?.status) ? false : true} className='p-4 w-full h-10 text-center' onClick={() => postDispenses(sheet._id!)}>
                                                        Post
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        }
                                        {sheet.settelment?.dateTime !== undefined &&
                                            <Link href={`/tripsheets/${sheet._id}`}>
                                                <Button variant="outline" size="lg">
                                                    <Eye />
                                                </Button>
                                            </Link>
                                        }
                                        {/* <OnlyAllowed allowedRoles={["Admin"]}>
                                            <Button variant="destructive" size="lg" onClick={() => openDeleteDialogue(sheet._id!)}>
                                                Delete
                                            </Button>
                                        </OnlyAllowed> */}
                                    </TableCell>
                                </OnlyAllowed>
                                <TableCell>{sheet.dispenses && sheet.dispenses.length > 0 && sheet.dispenses.every(dispense => dispense.verified?.status) ? <Check className='block mx-auto' /> : (sheet.dispenses && sheet.dispenses.length > 0 ? <X className='block mx-auto' /> : null)}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
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
