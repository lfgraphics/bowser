"use client"
import { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'next/navigation';
import { Eye, X } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { TripSheet, WholeTripSheet } from '@/types/index';
import { isAuthenticated } from '@/lib/auth';
import { BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AlertDialog, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogContent } from '@/components/ui/alert-dialog';
import { AlertDialogHeader } from './ui/alert-dialog';
import OnlyAllowed from './OnlyAllowed';
import { debounce } from '@/utils';
import Loading from '@/app/loading';


const TripSheetPage = ({ query }: { query: Record<string, string> }) => {
    const router = useRouter();
    const checkAuth = () => {
        if (typeof window !== 'undefined') {
            const authenticated = isAuthenticated();
            if (!authenticated) {
                window.location.href = '/login';
            }
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);

    const [sheets, setSheets] = useState<TripSheet[]>([]);
    const [searchParam, setSearchParam] = useState<string>(query?.searchParam || '');
    const [loading, setLoading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState<boolean>(false);
    const [settlment, setSettlment] = useState<boolean>(query?.settlment === 'true');
    const [deletingSheetId, setDeletingSheetId] = useState<string>('');
    const [summaryId, setSummaryId] = useState<string | undefined>(undefined);
    const [showSummaryDialog, setShowSummaryDialog] = useState<boolean>(false);
    const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
    const [summaryData, setSummaryData] = useState<WholeTripSheet | null>(null);
    const { toast } = useToast();

    const fetchSummary = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/tripsheet/summary/get/${summaryId}`);
            setSummaryData(response.data);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load summary', variant: "destructive" });
        } finally {
            setSummaryLoading(false);
        }
    }

    useEffect(() => {
        if (!summaryId || summaryId == undefined) return;
        setShowSummaryDialog(true);
        setSummaryLoading(true);
        fetchSummary();
    }, [summaryId])

    const loadSheets = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/tripsheet/all`, {
                params: { searchParam, settlment },
            });
            setSheets(response.data);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load sheets', variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const debouncedLoadSheets = useCallback(debounce(loadSheets, 2000), [searchParam, settlment]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (searchParam) params.set('searchParam', searchParam);
        params.set('settlment', settlment.toString());
        router.push(`?${params.toString()}`);

        debouncedLoadSheets();
    }, [searchParam, settlment, debouncedLoadSheets]);

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

    // const openDeleteDialogue = (sheetId: string) => {
    //     setDeletingSheetId(sheetId)
    //     setShowDeleteDialog(true)
    // }

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
                                <TableCell>{`${formatDate(sheet.createdAt)}`}</TableCell>
                                <TableCell>{`${sheet.settelment?.dateTime !== undefined ? formatDate(sheet.settelment.dateTime) : ""}`}</TableCell>
                                <TableCell>{sheet.bowser.regNo}</TableCell>
                                <TableCell>{sheet.bowser.driver?.length > 0 ? sheet.bowser.driver[0]?.name : ""}</TableCell>
                                <TableCell>{sheet.bowser.driver?.length > 0 ? sheet.bowser.driver[0]?.phoneNo : ""}</TableCell>
                                <TableCell>{(sheet.totalLoadQuantityBySlip || 0) + (sheet.totalAdditionQty || 0)}</TableCell>
                                <TableCell className='text-center' >{sheet.dispenses?.length || "0"}</TableCell>
                                <TableCell>{sheet.saleQty?.toFixed(2)}</TableCell>
                                <TableCell>{(Number((sheet.totalLoadQuantityBySlip || 0) + (sheet.totalAdditionQty || 0)) - Number(sheet.saleQty?.toFixed(2))).toFixed(2)}</TableCell>
                                <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer"]}>
                                    <TableCell className="flex justify-center gap-2 w-full">
                                        {sheet.settelment?.dateTime == undefined &&
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="default" size="sm" className='p-2 px-4 my-1 h-10 text-center '>
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
                                                    <Link className='items-center w-full text-center' href={sheet.settelment?.dateTime == undefined ? `/tripsheets/close/${sheet._id}` : ``}>
                                                        <DropdownMenuItem disabled={sheet.settelment?.dateTime !== undefined} className='items-center p-4 w-full h-10'>
                                                            Close
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
                                            <div className='flex flex-row items-center justify-center gap-2'>
                                                <Link href={`/tripsheets/${sheet._id}`} className='my-1'>
                                                    <Button variant="secondary" size="default">
                                                        <Eye />
                                                    </Button>
                                                </Link>
                                                <Button variant="secondary" onClick={() => { setSummaryId(sheet._id!); setShowSummaryDialog(true) }}>Summary</Button>
                                            </div>
                                        }
                                    </TableCell>
                                </OnlyAllowed>
                                <TableCell>{sheet.dispenses && sheet.dispenses.length > 0 && sheet.dispenses.every(dispense => dispense.verified?.status == true) ? <Link href={`/tripsheets/post/${sheet._id}`}> <Button variant="default">Post</Button> </Link> : (sheet.dispenses && sheet.dispenses.length > 0 ? <X className="text-red-500 block mx-auto" /> : null)}</TableCell>
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

            {showSummaryDialog && <AlertDialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
                <AlertDialogContent className='w-[800px]'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Summary</AlertDialogTitle>
                        <AlertDialogDescription className='text-white'>
                            {summaryLoading ? (
                                <Loading />
                            ) : summaryData ? (
                                <div className="flex flex-col space-y-4">
                                    {summaryData.closure && summaryData.closure.details && (
                                        <div className="relative flex justify-center items-center mb-4">
                                            <div className="absolute text-center text-red-600 font-bold text-xl transform rotate-[-15deg] border-4 border-red-600 border-dashed px-4 py-2">
                                                {summaryData.closure.details.reason}
                                            </div>
                                        </div>
                                    )}
                                    <h2 className="text-lg font-bold">Trip Sheet ID: {summaryData.tripSheetId}</h2>
                                    <p><strong>Total Load Quantity:</strong> {summaryData.totalLoadQuantityBySlip}</p>
                                    <p><strong>Total Dispenses:</strong> {summaryData.dispenses.length}</p>
                                    <p><strong>Total Sale Quantity:</strong> {summaryData.saleQty}</p>
                                    <p><strong>Total Balance:</strong> {(Number(summaryData.totalLoadQuantityBySlip) - Number(summaryData.saleQty)).toFixed(2)}</p>
                                    {summaryData.settelment && <p><strong>Dip Quantity after settelment:</strong>{summaryData.settelment.details.chamberwiseDipList.reduce((total, chamber) => total + chamber.qty, 0)}</p>}
                                    {typeof summaryData.loading.sheetId !== 'string' && summaryData.loading.sheetId.changeInOpeningDip && <p><strong>Cause of change in opening Dip:</strong>{`${summaryData.loading.sheetId.changeInOpeningDip.reason}${summaryData.loading.sheetId.changeInOpeningDip.remarks ? `, ${summaryData.loading.sheetId.changeInOpeningDip.remarks}` : ''}`}</p>}
                                    {summaryData.closure && summaryData.closure.details && <p><strong>Reason of closure:</strong>{`${summaryData.closure.details.reason} ${summaryData.closure.details.remarks ? ', ' + summaryData.closure.details.remarks : ''}`}</p>}
                                </div>
                            ) : (
                                <div className="text-center">No summary data available.</div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => { setShowSummaryDialog(false); setSummaryId(undefined) }}>Close</AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>}
        </div >
    );
};

export default TripSheetPage;
