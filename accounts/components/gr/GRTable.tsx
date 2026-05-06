"use client";

import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

interface GRTableProps {
    data: any[];
    onSelect: (gr: any) => void;
}

export function GRTable({ data, onSelect }: GRTableProps) {
    return (
        <div className="rounded-md border border-brand-border bg-brand-bg-900/30 overflow-hidden">
            <Table>
                <TableHeader className="bg-brand-bg-900/50">
                    <TableRow className="border-brand-border hover:bg-transparent">
                        <TableHead className="text-slate-400 font-medium">GR No</TableHead>
                        <TableHead className="text-slate-400 font-medium">Vehicle</TableHead>
                        <TableHead className="text-slate-400 font-medium">Date</TableHead>
                        <TableHead className="text-slate-400 font-medium">Qty (Ltr)</TableHead>
                        <TableHead className="text-slate-400 font-medium">Shortage</TableHead>
                        <TableHead className="text-slate-400 font-medium">Consignee</TableHead>
                        <TableHead className="text-slate-400 font-medium">Status</TableHead>
                        <TableHead className="text-right text-slate-400 font-medium">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                                No Goods Receipts found
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((gr) => {
                            const shortage = gr.unloading?.gM?.qty 
                                ? (Number(gr.loading?.qty || 0) - Number(gr.unloading?.gM?.qty || 0))
                                : 0;
                                
                            return (
                                <TableRow key={gr._id} className="border-brand-border hover:bg-white/5 transition-colors">
                                    <TableCell className="font-medium text-white">{gr.GRNo || "N/A"}</TableCell>
                                    <TableCell className="text-slate-300">{gr.vehicleNo}</TableCell>
                                    <TableCell className="text-slate-300">
                                        {gr.loading?.date ? format(new Date(gr.loading.date), "dd MMM yyyy") : "N/A"}
                                    </TableCell>
                                    <TableCell className="text-slate-300">{gr.loading?.qty?.toLocaleString()}</TableCell>
                                    <TableCell>
                                        {gr.unloading?.gM?.qty ? (
                                            <span className={`font-bold text-xs ${shortage > 0 ? 'text-brand-danger' : 'text-brand-success'}`}>
                                                {shortage > 0 ? `+${shortage}` : shortage} Ltr
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 text-[10px] italic">Pending</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-300 truncate max-w-[150px]">{gr.consignee}</TableCell>
                                    <TableCell>
                                        {gr.unloading?.gM?.qty ? (
                                            <Badge className="bg-brand-success/20 text-brand-success border-brand-success/30 gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Unloaded
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="border-slate-700 text-slate-500">
                                                Pending
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => onSelect(gr)}
                                            className="text-brand-primary hover:text-white hover:bg-brand-primary/20"
                                        >
                                            <Edit3 className="w-4 h-4 mr-1" />
                                            Update
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

// Simple Badge component if not present in components/ui
function Badge({ children, className, variant = "default" }: any) {
    const variants: any = {
        default: "bg-brand-primary text-white",
        outline: "border border-slate-700 text-slate-400",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant] || ""} ${className}`}>
            {children}
        </span>
    );
}
