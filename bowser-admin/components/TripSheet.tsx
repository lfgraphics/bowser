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
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Toaster } from "@/components/ui/toaster"
import { Edit, Eye, Plus, SortAsc, SortDesc, PlusIcon } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { TripSheet, Filters, Sort } from '@/types/index';


const TripSheetPage = () => {
    const [sheets, setSheets] = useState<TripSheet[]>([]);
    const [filters, setFilters] = useState<Filters>({
        driverName: '',
        bowserRegNo: '',
        tripSheetId: '',
        unsettled: false,
    });
    const [sort, setSort] = useState<Sort>({ field: '', order: 'desc' });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadSheets();
    }, [filters, sort]);

    const loadSheets = async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://bowser-backend-2cdr.onrender.com/tripsheet/all', {
                params: { ...filters, sortField: sort.field, sortOrder: sort.order },
            });
            setSheets(response.data);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load sheets', variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background text-foreground p-6">
            <div className="flex justify-between items-start">
                <h1 className="text-2xl font-bold mb-4">Trip Sheets</h1>
                <Link href={`/tripsheets/create`}>
                    <Button variant="secondary">
                        <Plus className="mr-2" /> Create New Sheet
                    </Button>
                </Link>
            </div>
            <Toaster />
            <div className="mb-4 flex space-x-4">
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
                            <SelectLabel>Status</SelectLabel>
                            <SelectItem value="false">All</SelectItem>
                            <SelectItem value="true">Unsettled</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <Table className="w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead className='flex gap-3' onClick={() => setSort({ field: 'tripSheetId', order: sort.order === 'asc' ? 'desc' : 'asc' })}>
                            Trip Sheet ID {sort.order === "asc" ? <SortAsc /> : <SortDesc />}
                        </TableHead>
                        <TableHead>Created on</TableHead>
                        <TableHead>Driver Name</TableHead>
                        <TableHead>Driver Id</TableHead>
                        <TableHead>Bowser Reg No</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                        </TableRow>
                    ) : sheets.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center">No records found</TableCell>
                        </TableRow>
                    ) : (
                        sheets.map((sheet) => (
                            <TableRow key={sheet._id}>
                                <TableCell>{sheet.tripSheetId}</TableCell>
                                <TableCell>{sheet.tripSheetGenerationDateTime}</TableCell>
                                <TableCell>{sheet.bowserDriver[0].name}</TableCell>
                                <TableCell>{sheet.bowserDriver[0].id}</TableCell>
                                <TableCell>{sheet.bowser.regNo}</TableCell>
                                <TableCell className="flex space-x-2">
                                    <Link href={`/tripsheets/edit/${sheet._id}`}>
                                        <Button variant="ghost">
                                            <Edit />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default TripSheetPage;
