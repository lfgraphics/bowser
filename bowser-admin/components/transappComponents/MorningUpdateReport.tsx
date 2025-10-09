"use client"

import React, { useState } from "react";

import { Share2, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { toJpeg } from 'html-to-image';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatVehicleRemark, toProperTitleCase } from "@/utils";

type VehicleReportItem = {
    vehicleNo: string;
    remark: string;
    location: string;
    plannedFor: string;
    unloadedAt: string;
    driverName: string;
    driverPhone?: string;
    isReported: boolean;
};

export type MorningUpdateReportData = {
    user: { name: string };
    date: string; // formatted date
    openingTime: string; // formatted time
    closingTime: string; // formatted time
    vehicles: Array<VehicleReportItem>;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    reportData: MorningUpdateReportData;
};

const MorningUpdateReport: React.FC<Props> = ({ isOpen, onClose, reportData }) => {
    const [isSharing, setIsSharing] = useState(false);
    const snapshotRef = React.useRef<HTMLDivElement>(null);

    const handleShare = async () => {
        setIsSharing(true);
        try {
            if (!snapshotRef.current) throw new Error("Snapshot node missing");

            const originalHeight = snapshotRef.current.style.height;
            snapshotRef.current.style.height = 'auto';

            if ((document as any).fonts && typeof (document as any).fonts.ready?.then === "function") {
                await (document as any).fonts.ready;
            } else {
                await new Promise((r) => setTimeout(r, 300));
            }

            const dataUrl = await toJpeg(document.getElementById('snapshot')!, {
                pixelRatio: 2,
                quality: 2,
                backgroundColor: "#ffffff",
            });

            snapshotRef.current.style.height = originalHeight;

            const blob = await fetch(dataUrl).then((r) => r.blob());
            const file = new File([blob], "morning-update-report.jpg", { type: "image/jpeg" });

            const nav: any = typeof navigator !== "undefined" ? navigator : undefined;
            if (nav && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
                await nav.share({ files: [file], title: "Morning Update Report" });
                toast.success("Report shared successfully");
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "morning-update-report.jpg";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("Report downloaded");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to share report", { description: String(err) });
        } finally {
            setIsSharing(false);
        }
    };

    const currentTs = new Date().toLocaleString();

    return (
        <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-screen-lg max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Morning Update Report</DialogTitle>
                </DialogHeader>

                {/* Sharable content - no scroll, full height auto */}
                <div
                    id="snapshot"
                    ref={snapshotRef}
                    className="mx-auto"
                    style={{
                        width: 500,
                        minWidth: 500,
                        backgroundColor: "white",
                        padding: 24,
                        color: "#111827",
                        fontFamily:
                            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, \"Apple Color Emoji\", \"Segoe UI Emoji\"",
                        overflow: "visible",
                    }}
                >
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="mt-1 text-lg font-bold">{(reportData.user?.name).toUpperCase() || "—"}</div>
                        <div className="mt-1 text-sm text-gray-700 font-bold">{reportData.date}</div>
                        <div className="mt-1 text-xs text-gray-600">Morning Update</div>
                    </div>

                    {/* Vehicles Table */}
                    <div className="space-y-6">
                        {reportData.vehicles?.map((v, idx) => (
                            <div key={`${v.vehicleNo}-${idx}`} className="border rounded-md px-4">
                                <table className="w-full">
                                    <tbody>
                                        {/* Row 1: Vehicle No. with reported status */}
                                        <tr>
                                            <td className="py-1 align-mid" style={{ fontSize: '12px', width: '18%' }}>Vehicle No.</td>
                                            <td className="font-bold py-1" style={{ fontSize: '36px', width: '33%' }}>{v.vehicleNo}</td>
                                            <td className="py-1 text-right align-mid" style={{ width: '33%' }}>
                                                <div
                                                    className={`inline-flex items-end justify-end px-3 py-1 text-white font-medium text-right ${v.isReported ? 'bg-green-600' : 'bg-orange-600'
                                                        }`}
                                                    style={{
                                                        fontSize: '12px',
                                                        clipPath: 'polygon(25% 0%, 100% 0%, 100% 100%, 25% 100%, 0% 50%)',
                                                        minWidth: '100px'
                                                    }}
                                                >
                                                    {v.isReported ? 'REPORTED' : 'ON WAY'}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Row 2: Planned for */}
                                        <tr className="bg-blue-600/30">
                                            <td className="py-1 align-mid" style={{ fontSize: '12px', width: '18%' }}>Planned for</td>
                                            <td className="font-semibold py-1" style={{ fontSize: '18px' }} colSpan={2}>{v.plannedFor.split(':')[1] || v.plannedFor.split(':')[0] || v.plannedFor}</td>
                                        </tr>

                                        {/* Row 3: Currently at */}
                                        <tr>
                                            <td className="py-1 align-mid" style={{ fontSize: '12px', width: '18%' }}>Currently at</td>
                                            <td className="font-semibold py-1" style={{ fontSize: '18px' }} colSpan={2}>{toProperTitleCase(v.location.split(':')[1] || v.location.split(':')[0])}</td>
                                        </tr>

                                        {/* Row 4: Unloaded at */}
                                        <tr className="bg-muted/10">
                                            <td className="py-1 align-mid" style={{ fontSize: '12px', width: '18%' }}>Unloaded at</td>
                                            <td className="font-semibold py-1" style={{ fontSize: '18px' }} colSpan={2}>{toProperTitleCase(v.unloadedAt)}</td>
                                        </tr>

                                        {v.remark &&
                                            <>
                                                {/* Row 5: Remark label */}
                                                <tr>
                                                    <td className="py-1 align-mid" style={{ fontSize: '12px', width: '18%' }}>Remark</td>
                                                    <td className="py-1" colSpan={2}></td>
                                                </tr>
                                                <tr className="bg-muted/10">
                                                    <td className="py-1" style={{ fontSize: '18px' }} colSpan={3}>
                                                        {formatVehicleRemark(v.remark)}
                                                    </td>
                                                </tr>
                                            </>
                                        }

                                        {/* Row 6: Driver */}
                                        <tr>
                                            <td className="py-1 align-mid" style={{ fontSize: '12px', width: '18%' }}>Driver</td>
                                            <td className="font-semibold py-1 flex" style={{ fontSize: '12px' }}>
                                                {`${v.driverName}`}
                                            </td>
                                            {v.driverPhone &&
                                                <td>
                                                    <span className="flex gap-2 items-center justify-end">
                                                        <Phone size={12} /> {v.driverPhone}
                                                    </span>
                                                </td>
                                            }
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 text-[11px] text-gray-600 text-right">Generated on {formatDate(currentTs)}</div>
                </div>

                {/* Buttons above content */}
                <DialogFooter className="mb-4 flex justify-end gap-2 fixed bottom-4 w-full">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSharing}>Close</Button>
                    <Button type="button" onClick={handleShare} disabled={isSharing}>
                        {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Share as Image
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>

    );
};

export default MorningUpdateReport;
