"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface ExpenseField {
    perDay?: number | string;
    total?: number | string;
    efffectiveFrom: string;
}

export interface OtherExpense {
    type: string;
    amount: number | string;
    efffectiveFrom: string;
}

export interface TripExpenseMaster {
    _id?: string;
    wheelType: string;
    from: string;
    to: string;
    days: number | string;
    running: ExpenseField;
    return: ExpenseField;
    fooding: ExpenseField;
    incentive: ExpenseField;
    parking: ExpenseField;
    other: OtherExpense[];
    totalExpense: number;
}

const WHEEL_TYPES = [
    '12 Wheeler',
    '14 Wheeler',
    '16 Wheeler',
    '22 Wheeler',
    '16 Trellar',
    '22 Trellar',
];

const TODAY = new Date().toISOString().split('T')[0];

const BLANK_FORM: TripExpenseMaster = {
    wheelType: '',
    from: '',
    to: '',
    days: '',
    running: { perDay: '', efffectiveFrom: TODAY },
    return: { total: '', efffectiveFrom: TODAY },
    fooding: { perDay: '', efffectiveFrom: TODAY },
    incentive: { total: '', efffectiveFrom: TODAY },
    parking: { perDay: '', efffectiveFrom: TODAY },
    other: [],
    totalExpense: 0,
};

function calcTotal(data: TripExpenseMaster): number {
    const days = Number(data.days) || 0;
    const running = (Number(data.running.perDay) || 0) * days;
    const ret = Number(data.return.total) || 0;
    const fooding = (Number(data.fooding.perDay) || 0) * days;
    const incentive = Number(data.incentive.total) || 0;
    const parking = (Number(data.parking.perDay) || 0) * days;
    const other = data.other.reduce((s, o) => s + (Number(o.amount) || 0), 0);
    return running + ret + fooding + incentive + parking + other;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: TripExpenseMaster | null;
    onSave: (data: TripExpenseMaster) => Promise<void>;
}

/**
 * Converts any date value (ISO string, Date, or already-formatted) to
 * the strict yyyy-MM-dd format required by <input type="date">.
 * Falls back to today if the value is invalid.
 */
function toDateInput(value?: string | Date | null): string {
    if (!value) return TODAY;
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return TODAY;
        return d.toISOString().split('T')[0]; // always gives yyyy-MM-dd
    } catch {
        return TODAY;
    }
}

export default function ExpenseMasterForm({ open, onOpenChange, initialData, onSave }: Props) {
    const [form, setForm] = useState<TripExpenseMaster>(BLANK_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (initialData) {
                // Normalise all date fields from ISO strings → yyyy-MM-dd
                // before binding to <input type="date"> elements
                setForm({
                    ...BLANK_FORM,
                    ...initialData,
                    running:   { ...initialData.running,   efffectiveFrom: toDateInput(initialData.running.efffectiveFrom) },
                    return:    { ...initialData.return,    efffectiveFrom: toDateInput(initialData.return.efffectiveFrom) },
                    fooding:   { ...initialData.fooding,   efffectiveFrom: toDateInput(initialData.fooding.efffectiveFrom) },
                    incentive: { ...initialData.incentive, efffectiveFrom: toDateInput(initialData.incentive.efffectiveFrom) },
                    parking:   { ...initialData.parking,   efffectiveFrom: toDateInput(initialData.parking.efffectiveFrom) },
                    other: initialData.other.map(o => ({
                        ...o,
                        efffectiveFrom: toDateInput(o.efffectiveFrom),
                    })),
                });
            } else {
                setForm(BLANK_FORM);
            }
        }
    }, [open, initialData]);

    const set = (path: string, value: any) => {
        setForm(prev => {
            const next = structuredClone(prev);
            const keys = path.split('.');
            let node: any = next;
            for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]];
            node[keys[keys.length - 1]] = value;
            next.totalExpense = calcTotal(next);
            return next;
        });
    };

    const addOther = () =>
        setForm(prev => ({
            ...prev,
            other: [...prev.other, { type: '', amount: '', efffectiveFrom: TODAY }],
        }));

    const removeOther = (idx: number) =>
        setForm(prev => {
            const other = prev.other.filter((_, i) => i !== idx);
            const next = { ...prev, other };
            next.totalExpense = calcTotal(next);
            return next;
        });

    const updateOther = (idx: number, key: keyof OtherExpense, value: string) =>
        setForm(prev => {
            const other = [...prev.other];
            other[idx] = { ...other[idx], [key]: value };
            const next = { ...prev, other };
            next.totalExpense = calcTotal(next);
            return next;
        });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Coerce all numeric string fields to actual numbers before sending
            // (empty string '' would fail Joi's number() validation on the backend)
            const payload: TripExpenseMaster = {
                ...form,
                _id: form._id,
                days: Number(form.days) || 0,
                totalExpense: form.totalExpense,
                running: { perDay: Number(form.running.perDay) || 0, efffectiveFrom: form.running.efffectiveFrom },
                return: { total: Number(form.return.total) || 0, efffectiveFrom: form.return.efffectiveFrom },
                fooding: { perDay: Number(form.fooding.perDay) || 0, efffectiveFrom: form.fooding.efffectiveFrom },
                incentive: { total: Number(form.incentive.total) || 0, efffectiveFrom: form.incentive.efffectiveFrom },
                parking: { perDay: Number(form.parking.perDay) || 0, efffectiveFrom: form.parking.efffectiveFrom },
                other: form.other.map(o => ({ ...o, amount: Number(o.amount) || 0 })),
            };
            await onSave(payload);
        } catch (err: any) {
            // Show backend validation errors or network errors to the user
            toast.error(err?.message || 'Failed to save. Please check all fields.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditing = !!initialData?._id;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
                <DialogHeader className="px-8 pt-8 pb-4 border-b border-border/60">
                    <DialogTitle className="text-xl font-bold">
                        {isEditing ? 'Edit Expense Rule' : 'New Expense Rule'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm mt-0.5">
                        Define standard trip expense amounts per route and vehicle type.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-6 space-y-8">

                        {/* ── SECTION 1: Basic Info ── */}
                        <section>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                                Route &amp; Vehicle
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Wheel Type</Label>
                                    <Select
                                        value={form.wheelType}
                                        onValueChange={v => set('wheelType', v)}
                                        required
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Select…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {WHEEL_TYPES.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">From</Label>
                                    <Input
                                        value={form.from}
                                        onChange={e => set('from', e.target.value)}
                                        placeholder="e.g. Katni"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">To</Label>
                                    <Input
                                        value={form.to}
                                        onChange={e => set('to', e.target.value)}
                                        placeholder="e.g. Rewa"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Trip Days</Label>
                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.days}
                                        onChange={e => set('days', e.target.value)}
                                        placeholder="e.g. 2"
                                        required
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ── SECTION 2: Expense Breakdown ── */}
                        <section>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                                Expense Breakdown
                            </h3>

                            {/* Table-style header */}
                            <div className="hidden md:grid grid-cols-[2fr_2fr_2fr] gap-4 px-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 mb-1">
                                <span>Expense Type</span>
                                <span>Amount (₹)</span>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Effective From</span>
                            </div>

                            {/* Rows */}
                            {[
                                { label: 'Running', sublabel: '× days', key: 'running', field: 'perDay', fieldLabel: 'per day' },
                                { label: 'Return', sublabel: 'one-time', key: 'return', field: 'total', fieldLabel: 'total' },
                                { label: 'Fooding', sublabel: '× days', key: 'fooding', field: 'perDay', fieldLabel: 'per day' },
                                { label: 'Incentive', sublabel: 'one-time', key: 'incentive', field: 'total', fieldLabel: 'total' },
                                { label: 'Parking', sublabel: '× days', key: 'parking', field: 'perDay', fieldLabel: 'per day' },
                            ].map(({ label, sublabel, key, field, fieldLabel }) => (
                                <div
                                    key={key}
                                    className="grid grid-cols-1 md:grid-cols-[2fr_2fr_2fr] gap-4 items-center py-3 border-b border-border/30 last:border-0 px-1"
                                >
                                    <div>
                                        <p className="font-semibold text-sm">{label}</p>
                                        <p className="text-[11px] text-muted-foreground">{sublabel}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground md:hidden">Amount ({fieldLabel})</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                value={(form as any)[key][field]}
                                                onChange={e => set(`${key}.${field}`, e.target.value)}
                                                placeholder="0"
                                                className="pl-7 font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground md:hidden">Effective From</Label>
                                        <Input
                                            type="date"
                                            value={(form as any)[key].efffectiveFrom}
                                            onChange={e => set(`${key}.efffectiveFrom`, e.target.value)}
                                            className="h-10"
                                        />
                                    </div>
                                </div>
                            ))}
                        </section>

                        {/* ── SECTION 3: Other/Extra Expenses ── */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        Other / Extra Expenses
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Optional one-off or named expenses</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addOther}
                                    className="h-8 text-xs gap-1.5"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Extra
                                </Button>
                            </div>

                            {form.other.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground bg-muted/10">
                                    No extra expenses — click "Add Extra" to include one
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {form.other.map((o, idx) => (
                                        <div
                                            key={idx}
                                            className="grid grid-cols-[2fr_2fr_2fr_auto] gap-3 items-center bg-muted/20 rounded-lg px-4 py-3 border border-border/30"
                                        >
                                            <Input
                                                placeholder="Expense name"
                                                value={o.type}
                                                onChange={e => updateOther(idx, 'type', e.target.value)}
                                                className="h-9 text-sm"
                                            />
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                                <Input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="0"
                                                    value={o.amount}
                                                    onChange={e => updateOther(idx, 'amount', e.target.value)}
                                                    className="pl-7 h-9 font-mono"
                                                />
                                            </div>
                                            <Input
                                                type="date"
                                                value={o.efffectiveFrom}
                                                onChange={e => updateOther(idx, 'efffectiveFrom', e.target.value)}
                                                className="h-9 text-sm"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeOther(idx)}
                                                className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* ── Footer / Total ── */}
                    <DialogFooter className="px-8 py-5 border-t border-border/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-muted/10">
                        <div className="flex items-baseline gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Estimated Total
                            </span>
                            <span className="text-3xl font-black text-primary tabular-nums">
                                ₹{form.totalExpense.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                                className="px-6"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-8 gap-2"
                            >
                                {isSubmitting
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Save className="h-4 w-4" />
                                }
                                {isEditing ? 'Save Changes' : 'Create Rule'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
