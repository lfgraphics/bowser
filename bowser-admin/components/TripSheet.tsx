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
import { Trash, Edit, Eye, Plus, SortAsc, SortDesc, PlusIcon } from 'lucide-react'; // Lucide React icons
import axios from 'axios'; // For API calls
import { useToast } from '@/hooks/use-toast';
import { TripSheet, Filters, Sort } from '@/types/index';


const TripSheetPage = () => {
    const [sheets, setSheets] = useState<TripSheet[]>([]); // Use TripSheet[] for the sheets state
    const [filters, setFilters] = useState<Filters>({
        driverName: '',
        bowserRegNo: '',
        tripSheetId: '',
        unsettled: false,
    });
    const [sort, setSort] = useState<Sort>({ field: '', order: 'asc' });
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

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this Trip Sheet?')) {
            setLoading(true);
            try {
                await axios.delete(`https://bowser-backend-2cdr.onrender.com/tripsheet/${id}`);
                toast({ title: 'Success', description: 'Trip Sheet deleted successfully', variant: 'success' });
                loadSheets();
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to delete Trip Sheet', variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="bg-background text-foreground p-6">
            <h1 className="text-2xl font-bold mb-4">Trip Sheets</h1>
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
                        <TableHead onClick={() => setSort({ field: 'tripSheetId', order: sort.order === 'asc' ? 'desc' : 'asc' })}>
                            Trip Sheet ID {sort.order === "asc" ? <SortAsc /> : <SortDesc />}
                        </TableHead>
                        <TableHead>Driver Name</TableHead>
                        <TableHead>Bowser Reg No</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                        </TableRow>
                    ) : sheets.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">No records found</TableCell>
                        </TableRow>
                    ) : (
                        sheets.map((sheet) => (
                            <TableRow key={sheet._id}>
                                <TableCell>{sheet.tripSheetId}</TableCell>
                                <TableCell>{sheet.bowserDriver[0].name}</TableCell>
                                <TableCell>{sheet.bowser.regNo}</TableCell>
                                <TableCell className="flex space-x-2">
                                    <Link href={`/tripsheets/view/${sheet._id}`}>
                                        <Button variant="ghost">
                                            <Eye />
                                        </Button>
                                    </Link>
                                    <Link href={`/tripsheets/edit/${sheet._id}`}>
                                        <Button variant="ghost">
                                            <Edit />
                                        </Button>
                                    </Link>
                                    <Button variant="ghost" onClick={() => handleDelete(sheet._id ? sheet._id : '')} color="red">
                                        <Trash />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            <Link href={`/tripsheets/create`}>
                <Button variant="secondary" className="mt-4">
                    <Plus className="mr-2" /> Create New Sheet < PlusIcon />
                </Button>
            </Link>
        </div>
    );
};

export default TripSheetPage;
