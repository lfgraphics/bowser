"use client";

import React, { useState, useCallback } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Loader2,
    ChevronRight,
    ChevronLeft,
    Search,
    StepBack,
} from 'lucide-react';
import { BASE_URL } from '@/lib/api';
import { useDebounceEffect } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import ExpenseMasterForm, { TripExpenseMaster } from './ExpenseMasterForm';

const WHEEL_TYPES = [
    '12 Wheeler',
    '14 Wheeler',
    '16 Wheeler',
    '22 Wheeler',
    '16 Trellar',
    '22 Trellar',
];

const PAGE_SIZES = [10, 20, 50] as const;

function calcDisplayTotal(master: TripExpenseMaster): number {
    const days = Number(master.days) || 0;
    return (
        (Number(master.running.perDay) || 0) * days +
        (Number(master.return.total) || 0) +
        (Number(master.fooding.perDay) || 0) * days +
        (Number(master.incentive.total) || 0) +
        (Number(master.parking.perDay) || 0) * days +
        master.other.reduce((s, o) => s + (Number(o.amount) || 0), 0)
    );
}


// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ExpenseMasterDashboard() {
    const [masters, setMasters] = useState<TripExpenseMaster[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination state
    const [pageSize, setPageSize] = useState<number>(20);
    const [page, setPage] = useState(1);
    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]); // stack of cursors per page
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);

    // Filters — all in React state
    const [filters, setFilters] = useState({ from: '', to: '', wheelType: 'all' });

    // Form dialog
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<TripExpenseMaster | null>(null);

    // Delete confirm dialog
    const [deleteTarget, setDeleteTarget] = useState<TripExpenseMaster | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Fetch a single page ──────────────────────────────────────────────────
    const fetchPage = useCallback(async (cursor: string | null) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', String(pageSize));
            if (filters.from.trim()) params.set('from', filters.from.trim());
            if (filters.to.trim()) params.set('to', filters.to.trim());
            if (filters.wheelType !== 'all') params.set('wheelType', filters.wheelType);
            if (cursor) params.set('cursor', cursor);

            const res = await fetch(`${BASE_URL}/accounts/api/tripExpenses?${params.toString()}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Fetch failed');

            const { data, nextCursor: nc, hasMore: hm } = json;
            setMasters(data || []);
            setNextCursor(nc || null);
            setHasMore(!!hm);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load expense rules');
        } finally {
            setIsLoading(false);
        }
    }, [filters, pageSize]);

    // Reset to page 1 when filters or pageSize change (debounced)
    useDebounceEffect(() => {
        setPage(1);
        setCursorHistory([null]);
        setNextCursor(null);
        setHasMore(false);
        fetchPage(null);
    }, 400, [filters, pageSize]);

    // ── Pagination handlers ──────────────────────────────────────────────────
    const goNextPage = () => {
        if (!hasMore || !nextCursor || isLoading) return;
        const newPage = page + 1;
        // Save the nextCursor so we can revisit this page later
        setCursorHistory(prev => {
            const next = [...prev];
            next[newPage - 1] = nextCursor; // index = page - 1
            return next;
        });
        setPage(newPage);
        fetchPage(nextCursor);
    };

    const goPrevPage = () => {
        if (page <= 1 || isLoading) return;
        const newPage = page - 1;
        setPage(newPage);
        fetchPage(cursorHistory[newPage - 1] ?? null);
    };

    const goFirstPage = () => {
        if (page === 1 || isLoading) return;
        setPage(1);
        setCursorHistory([null]);
        fetchPage(null);
    };

    // ── Save (create / edit) ─────────────────────────────────────────────────
    const handleSave = async (form: TripExpenseMaster) => {
        const isEdit = !!form._id;
        const url = isEdit
            ? `${BASE_URL}/accounts/api/tripExpenses/${form._id}`
            : `${BASE_URL}/accounts/api/tripExpenses`;

        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Save failed');

        toast.success(isEdit ? 'Rule updated' : 'Rule created');
        setFormOpen(false);
        setEditing(null);
        // Reset to first page to show the new/updated item
        setPage(1);
        setCursorHistory([null]);
        fetchPage(null);
    };

    // ── Delete (optimistic) ───────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget?._id) return;
        setIsDeleting(true);
        const targetId = deleteTarget._id;
        try {
            const res = await fetch(`${BASE_URL}/accounts/api/tripExpenses/${targetId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Delete failed');

            // Optimistic removal
            setMasters((prev: TripExpenseMaster[]) => prev.filter((m: TripExpenseMaster) => m._id !== targetId));
            toast.success('Rule deleted');
            setDeleteTarget(null);
        } catch (err: any) {
            toast.error(err.message || 'Delete failed');
        } finally {
            setIsDeleting(false);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const openCreate = () => { setEditing(null); setFormOpen(true); };
    const openEdit = (m: TripExpenseMaster) => { setEditing(m); setFormOpen(true); };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                <div className="flex flex-wrap items-end gap-3">
                    {/* From */}
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Origin"
                                value={filters.from}
                                onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                                className="pl-8 h-9 w-36 text-sm"
                            />
                        </div>
                    </div>

                    {/* To */}
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Destination"
                                value={filters.to}
                                onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                                className="pl-8 h-9 w-36 text-sm"
                            />
                        </div>
                    </div>

                    {/* Wheel Type */}
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Wheel Type</Label>
                        <Select
                            value={filters.wheelType}
                            onValueChange={v => setFilters(f => ({ ...f, wheelType: v }))}
                        >
                            <SelectTrigger className="h-9 w-38 text-sm">
                                <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {WHEEL_TYPES.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Clear */}
                    {(filters.from || filters.to || filters.wheelType !== 'all') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-xs text-muted-foreground"
                            onClick={() => setFilters({ from: '', to: '', wheelType: 'all' })}
                        >
                            Clear filters
                        </Button>
                    )}
                </div>

                <Button onClick={openCreate} size="sm" className="gap-1.5 shrink-0">
                    <Plus className="h-4 w-4" /> New Rule
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="font-semibold w-36">Vehicle Type</TableHead>
                            <TableHead className="font-semibold">Route</TableHead>
                            <TableHead className="font-semibold text-center w-16">Days</TableHead>
                            <TableHead className="font-semibold w-72">Expense Breakdown</TableHead>
                            <TableHead className="font-semibold text-right w-32">Total Est.</TableHead>
                            <TableHead className="w-24" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                                    <span className="text-sm">Loading…</span>
                                </TableCell>
                            </TableRow>
                        ) : masters.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center text-sm text-muted-foreground italic">
                                    No expense rules found
                                </TableCell>
                            </TableRow>
                        ) : (
                            masters.map(m => (
                                <TableRow key={m._id} className="group hover:bg-muted/20 transition-colors">
                                    <TableCell>
                                        <span className="text-xs font-semibold px-2 py-1 rounded bg-secondary/60 text-secondary-foreground whitespace-nowrap">
                                            {m.wheelType}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 font-medium text-sm">
                                            <span>{m.from}</span>
                                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span>{m.to}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-primary">
                                        {m.days}
                                    </TableCell>
                                    <TableCell>
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px] text-muted-foreground">
                                            <span>Run: <b className="text-foreground">₹{m.running.perDay}/d</b></span>
                                            <span>Return: <b className="text-foreground">₹{m.return.total}</b></span>
                                            <span>Food: <b className="text-foreground">₹{m.fooding.perDay}/d</b></span>
                                            <span>Incentive: <b className="text-foreground">₹{m.incentive.total}</b></span>
                                            {Number(m.parking.perDay) > 0 && (
                                                <span>Parking: <b className="text-foreground">₹{m.parking.perDay}/d</b></span>
                                            )}
                                            {m.other.length > 0 && (
                                                <span>+{m.other.length} extra</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-base tabular-nums text-primary">
                                        ₹{calcDisplayTotal(m).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => openEdit(m)}
                                            >
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => setDeleteTarget(m)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {!isLoading && (masters.length > 0 || page > 1) && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    {/* Left: item count */}
                    <p className="text-xs text-muted-foreground">
                        Showing {masters.length} rule{masters.length !== 1 ? 's' : ''} on this page
                    </p>

                    {/* Center: page navigation */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={goFirstPage}
                            disabled={page <= 1 || isLoading}
                            title="First page"
                        >
                            <StepBack className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={goPrevPage}
                            disabled={page <= 1 || isLoading}
                            title="Previous page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="px-3 py-1.5 text-sm font-medium tabular-nums bg-muted/40 rounded-md min-w-[4.5rem] text-center">
                            Page {page}
                        </span>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={goNextPage}
                            disabled={!hasMore || isLoading}
                            title="Next page"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Right: page size selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Rows</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={v => setPageSize(Number(v))}
                        >
                            <SelectTrigger className="h-8 w-[70px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZES.map(s => (
                                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Modular Form Dialog */}
            <ExpenseMasterForm
                open={formOpen}
                onOpenChange={open => { setFormOpen(open); if (!open) setEditing(null); }}
                initialData={editing}
                onSave={handleSave}
            />

            {/* Styled Confirm Delete Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={open => { if (!open) setDeleteTarget(null); }}
                title="Delete Expense Rule?"
                description={
                    deleteTarget
                        ? `This will permanently remove the rule for "${deleteTarget.from} → ${deleteTarget.to}" (${deleteTarget.wheelType}). This action cannot be undone.`
                        : ''
                }
                confirmLabel="Yes, Delete"
                onConfirm={handleDelete}
                isLoading={isDeleting}
            />
        </div>
    );
}
