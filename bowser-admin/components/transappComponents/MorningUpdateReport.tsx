"use client"

import React, { useState } from "react";

import { Share2, Loader2 } from "lucide-react";
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

type VehicleReportItem = {
    vehicleNo: string;
    route: string; // "StartFrom - EndTo"
    remark: string;
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
                        width: 600,
                        minWidth: 600,
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

                    {/* Vehicles Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {reportData.vehicles?.map((v, idx) => (
                            <div key={`${v.vehicleNo}-${idx}`} className="border rounded-md p-2 flex flex-row gap-2 justify-between">
                                <div className="basis-[50%]">
                                    <div className="text-lg font-bold tracking-wide">{v.vehicleNo}</div>
                                    <div className="text-sm mt-2 font-bold">
                                        <span className="font-normal">Status: </span>
                                        <span className="whitespace-pre-wrap break-words text-lg">{v.remark}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-start basis-[50%]">
                                    <div className="flex flex-col items-start basis-[50%]">
                                        {(() => {
                                            const getFromTo = (route: string) => {
                                                if (!route) return { from: "", to: "" };
                                                if (route.includes("→")) {
                                                    const parts = route.split("→");
                                                    const from = (parts[0] || "").trim().replace(/^From:\s*/i, "");
                                                    const rightPart = (parts[1] || "").trim();
                                                    const to = rightPart.includes(":") ? rightPart.split(":")[1].trim() : rightPart;
                                                    return { from, to };
                                                }
                                                if (route.includes(" - ")) {
                                                    const [from, to] = route.split(" - ").map((s) => s.trim());
                                                    return { from, to };
                                                }
                                                return { from: route, to: "" };
                                            };
                                            const { from, to } = getFromTo(v.route || "");
                                            return (
                                                <>
                                                    <div className="flex flex-row items-end gap-2">
                                                        <div className="text-lg text-black mt-1 font-bold">{to || "—"}</div>
                                                    </div>
                                                    <div className="flex flex-row items-end gap-2">
                                                        <span>From: </span>
                                                        <span>{from || "—"}</span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
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
