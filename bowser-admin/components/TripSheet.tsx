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
import { Toaster } from "@/components/ui/toaster"
import { ArrowDown01, ArrowUp10, Check, Edit, Plus, X } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { TripSheet, Filters, Sort } from '@/types/index';
import { isAuthenticated } from '@/lib/auth';
import { BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';


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
    const [sort, setSort] = useState<Sort>({ field: 'createdAt', order: 'desc' });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadSheets();
    }, [filters, sort]);

    const loadSheets = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/tripsheet/all`, {
                params: { ...filters, sortField: sort.field, sortOrder: sort.order },
            });
            setSheets(response.data);
            console.log(response.data);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load sheets', variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background p-6 text-foreground">
            <div className="flex justify-between items-start">
                <h1 className="mb-4 font-bold text-2xl">Trip Sheets</h1>
                <Link href={`/tripsheets/create`}>
                    <Button variant="secondary">
                        <Plus className="mr-2" /> Create New Sheet
                    </Button>
                </Link>
            </div>
            <Toaster />
            <div className="flex space-x-4 mb-4">
                <Input
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
                />
                <Select onValueChange={(value) => setFilters({ ...filters, unsettled: value === 'true' })}>
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
                        <TableHead onClick={() => setSort({ field: 'tripSheetId', order: sort.order === 'asc' ? 'desc' : 'asc' })}>
                            <div className='flex gap-3'>Trip Sheet ID {sort.order === "asc" ? <ArrowUp10 /> : <ArrowDown01 />}</div>
                        </TableHead>
                        <TableHead>Created on</TableHead>
                        <TableHead>Settled on</TableHead>
                        <TableHead>Driver Name</TableHead>
                        <TableHead>Driver Mobile</TableHead>
                        <TableHead>Bowser Reg No</TableHead>
                        <TableHead>Dispenses</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead>Verification</TableHead>
                        <TableHead>Post/ed</TableHead>
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
                                    <Link href={`/dispense-records?tripNumber=${sheet.tripSheetId}`}>
                                        {sheet.tripSheetId}
                                    </Link>
                                </TableCell>
                                <TableCell>{`${formatDate(sheet.tripSheetGenerationDateTime!)}`}</TableCell>
                                <TableCell>{`${sheet.settelment.dateTime !== undefined ? formatDate(sheet.settelment.dateTime) : "Un Settled"}`}</TableCell>
                                <TableCell>{sheet.bowser.driver?.length > 0 ? sheet.bowser.driver[0]?.name : "Old Data is not captured properly"}</TableCell>
                                <TableCell>{sheet.bowser.driver?.length > 0 ? sheet.bowser.driver[0]?.phoneNo : "Old Data is not captured properly"}</TableCell>
                                <TableCell>{sheet.bowser.regNo}</TableCell>
                                <TableCell>{sheet.dispenses?.length || "0"}</TableCell>
                                <TableCell className="flex space-x-2">
                                    <Link href={`/tripsheets/edit/${sheet._id}`}>
                                        <Button variant="ghost">
                                            <Edit />
                                        </Button>
                                    </Link>
                                </TableCell>
                                <TableCell>{sheet.dispenses && sheet.dispenses.length > 0 && sheet.dispenses.every(dispense => dispense.isVerified) ? <Check /> : (sheet.dispenses && sheet.dispenses.length > 0 ? <X /> : null)}</TableCell>
                                <TableCell><Button disabled variant="outline">Post</Button></TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default TripSheetPage;
