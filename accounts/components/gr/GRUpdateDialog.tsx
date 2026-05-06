"use client";

import { useState, useEffect } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, Check, Calculator, FileText, Building2 } from "lucide-react";
import { format } from "date-fns";

import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";

interface GRUpdateDialogProps {
    gr: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdateSuccess: () => void;
    session: any;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export function GRUpdateDialog({ gr, open, onOpenChange, onUpdateSuccess, session }: GRUpdateDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    // GM Form State
    const [gmGrNo, setGmGrNo] = useState("");
    const [gmVehicleNo, setGmVehicleNo] = useState("");
    const [gmQty, setGmQty] = useState("");
    const [gmCompany, setGmCompany] = useState("");
    const [gmImage, setGmImage] = useState<string | null>(null);
    const [gmExcisePassNo, setGmExcisePassNo] = useState("");
    const [gmExcisePassDate, setGmExcisePassDate] = useState("");

    useEffect(() => {
        if (gr) {
            setGmGrNo(gr.GRNo || "");
            setGmVehicleNo(gr.vehicleNo || "");
            setGmQty(gr.unloading?.gM?.qty?.toString() || "");
            setGmCompany(gr.unloading?.gM?.company || "");
            setGmImage(gr.unloading?.gM?.image || null);
            setGmExcisePassNo(gr.excisePassNo || "");
            setGmExcisePassDate(gr.excisePassDate ? format(new Date(gr.excisePassDate), "yyyy-MM-dd") : "");
        }
    }, [gr]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setGmImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGMUpdate = async () => {
        if (!gr || !canSubmit) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/accounts/api/gr/unloading/gm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify({
                    grId: gr._id,
                    grNo: gmGrNo,
                    vehicleNo: gmVehicleNo,
                    qty: Number(gmQty),
                    company: gmCompany,
                    image: gmImage,
                    excisePassNo: gmExcisePassNo,
                    excisePassDate: gmExcisePassDate
                }),
            });

            if (!response.ok) throw new Error("Failed to update GR");
            onUpdateSuccess();
            onOpenChange(false);
        } catch (err) {
            console.error(err);
            alert("Error updating GR (GM)");
        } finally {
            setIsLoading(false);
        }
    };

    const gmShortage = gr ? (Number(gr.loading?.qty || 0) - Number(gmQty || 0)) : 0;

    const isExistingUnloading = !!(gr?.unloading?.gM?.qty);
    const canSubmit = !!(gmQty && gmCompany && (isExistingUnloading || gmImage));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-brand-bg-900 border-brand-border text-white overflow-hidden p-0 gap-0">
                <div className="bg-brand-bg-800 p-6 border-b border-brand-border">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <FileText className="w-6 h-6 text-brand-primary" />
                            Update GR
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Loaded: {gr?.loading?.qty} Ltr | Assigned Vehicle: {gr?.vehicleNo}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Company</Label>
                            <Select value={gmCompany} onValueChange={setGmCompany}>
                                <SelectTrigger className="w-full bg-brand-bg-950 border-brand-border text-white h-10">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-slate-500" />
                                        <SelectValue placeholder="Select Company" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-brand-bg-900 border-brand-border text-white">
                                    {["ITA", "INFRA", "EXPO", "ITPL"].map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">GR Number</Label>
                            <Input 
                                value={gmGrNo}
                                onChange={(e) => setGmGrNo(e.target.value)}
                                placeholder="Enter GR No."
                                className="bg-brand-bg-950 border-brand-border"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Vehicle Number</Label>
                                <Input
                                    value={gmVehicleNo}
                                    onChange={(e) => setGmVehicleNo(e.target.value)}
                                    placeholder="Enter Vehicle No."
                                    className="bg-brand-bg-950 border-brand-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Unloaded Qty (GM)</Label>
                                <div className="relative">
                                    <Input 
                                        type="string"
                                        inputMode="decimal"
                                        value={gmQty}
                                        onChange={(e) => setGmQty(e.target.value)}
                                        placeholder="Liters"
                                        className="bg-brand-bg-950 border-brand-border pr-20"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">LITERS</span>
                                </div>
                            </div>
                            <div className="p-3 bg-brand-bg-950/50 rounded-lg border border-brand-border/50 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Calculator className="w-4 h-4" />
                                    Calculated Shortage:
                                </div>
                                <div className={`font-bold ${gmShortage > 0 ? 'text-brand-danger' : 'text-brand-success'}`}>
                                    {gmShortage} Ltr
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-slate-300">GR Image Upload</Label>
                            <div 
                                onClick={() => document.getElementById('gm-image-input')?.click()}
                                className="aspect-video bg-brand-bg-950 border-2 border-dashed border-brand-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-primary/50 transition-colors overflow-hidden group relative"
                            >
                                {gmImage ? (
                                    <>
                                        <img src={gmImage} alt="GR" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="w-8 h-8 text-slate-600 mb-2 group-hover:text-brand-primary" />
                                        <span className="text-xs text-slate-500">Click to upload image</span>
                                    </>
                                )}
                                <Input 
                                    id="gm-image-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Excise Pass No</Label>
                            <Input 
                                value={gmExcisePassNo}
                                onChange={(e) => setGmExcisePassNo(e.target.value)}
                                className="bg-brand-bg-950 border-brand-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Excise Pass Date</Label>
                            <Input 
                                type="date"
                                value={gmExcisePassDate}
                                onChange={(e) => setGmExcisePassDate(e.target.value)}
                                className="bg-brand-bg-950 border-brand-border"
                            />
                        </div>
                    </div>

                    <Button 
                        onClick={handleGMUpdate}
                        disabled={isLoading || !canSubmit}
                        className="w-full bg-brand-primary hover:bg-brand-primary/90"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        Post GR Unloading
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
