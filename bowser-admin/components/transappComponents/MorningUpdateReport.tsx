"use client"

import React, { useState, useEffect } from "react";

import { Share2, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [imageBlob, setImageBlob] = useState<Blob | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const currentTs = new Date().toLocaleString();

    // Generate body content for the report (API will wrap with Tailwind)
    const generateReportBodyContent = () => {
        return `
<div class="bg-white max-w-2xl mx-auto rounded-3xl shadow-2xl p-8">
    <!-- Header -->
    <div class="text-center mb-8 pb-6 border-b-4 border-blue-600">
        <h1 class="text-2xl font-bold text-slate-800 uppercase mb-2">
            ${(reportData.user?.name || "—").toUpperCase()}
        </h1>
        <div class="text-base font-bold text-slate-600 mb-1">${reportData.date}</div>
        <div class="text-sm text-slate-500">Morning Update</div>
    </div>
    
    <!-- Vehicles -->
    <div class="space-y-6">
        ${reportData.vehicles?.map((v) => `
            <div class="border-2 border-slate-200 rounded-xl overflow-hidden">
                <table class="w-full">
                    <tbody>
                        <!-- Vehicle Number Row -->
                        <tr>
                            <td class="py-3 px-4 text-xs text-slate-500 align-middle w-1/4">
                                Vehicle No.
                            </td>
                            <td class="py-3 px-4 text-4xl font-bold text-slate-900 w-1/3">
                                ${v.vehicleNo}
                            </td>
                            <td class="py-3 px-4 text-right align-middle w-5/12">
                                <div class="status-badge inline-flex items-center justify-end px-4 py-1.5 text-white font-semibold text-xs min-w-[100px] ${v.isReported ? 'bg-green-600' : 'bg-orange-600'}">
                                    ${v.isReported ? 'REPORTED' : 'ON WAY'}
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Planned For Row -->
                        <tr class="bg-blue-600/15">
                            <td class="py-3 px-4 text-xs text-slate-500 align-middle">
                                Planned for
                            </td>
                            <td class="py-3 px-4 text-lg font-semibold text-slate-900" colspan="2">
                                ${v.plannedFor.split(':')[1] || v.plannedFor.split(':')[0] || v.plannedFor}
                            </td>
                        </tr>
                        
                        <!-- Currently At Row -->
                        <tr>
                            <td class="py-3 px-4 text-xs text-slate-500 align-middle">
                                Currently at
                            </td>
                            <td class="py-3 px-4 text-lg font-semibold text-slate-900" colspan="2">
                                ${toProperTitleCase(v.location.split(':')[1] || v.location.split(':')[0])}
                            </td>
                        </tr>
                        
                        <!-- Unloaded At Row -->
                        <tr class="bg-slate-50">
                            <td class="py-3 px-4 text-xs text-slate-500 align-middle">
                                Unloaded at
                            </td>
                            <td class="py-3 px-4 text-lg font-semibold text-slate-900" colspan="2">
                                ${toProperTitleCase(v.unloadedAt)}
                            </td>
                        </tr>
                        
                        ${v.remark ? `
                        <!-- Remark Label Row -->
                        <tr>
                            <td class="py-3 px-4 text-xs text-slate-500 align-middle">
                                Remark
                            </td>
                            <td colspan="2"></td>
                        </tr>
                        <!-- Remark Content Row -->
                        <tr class="bg-slate-50">
                            <td class="py-3 px-4 text-base leading-relaxed text-slate-900" colspan="3">
                                ${formatVehicleRemark(v.remark)}
                            </td>
                        </tr>
                        ` : ''}
                        
                        <!-- Driver Row -->
                        <tr class="text-xs">
                            <td class="py-3 px-4 text-slate-500 align-middle">
                                Driver
                            </td>
                            <td class="py-3 px-4 font-semibold text-slate-900">
                                ${v.driverName}
                            </td>
                            ${v.driverPhone ? `
                            <td class="py-3 px-4">
                                <div class="flex items-center justify-end gap-2 text-slate-700">
                                    <span>📞</span>
                                    <span>${v.driverPhone}</span>
                                </div>
                            </td>
                            ` : '<td></td>'}
                        </tr>
                    </tbody>
                </table>
            </div>
        `).join('')}
    </div>
    
    <!-- Footer -->
    <div class="mt-6 text-right text-[11px] text-slate-500">
        Generated on ${formatDate(currentTs)}
    </div>
</div>
        `.trim();
    };

    // Generate image when dialog opens
    useEffect(() => {
        if (isOpen && !imageBlob) {
            generateImage();
        }
    }, [isOpen]);

    // Cleanup image URL on unmount
    useEffect(() => {
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [imageUrl]);

    const generateImage = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/html-to-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bodyContent: generateReportBodyContent(),
                    useTailwind: true,
                    customStyles: `
                        /* Custom clip-path for status badge */
                        .status-badge {
                            clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 25% 100%, 0% 50%);
                        }
                    `,
                    backgroundColor: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600',
                    format: 'png',
                    fullPage: true,
                    width: 800,
                    height: 1200,
                    filename: `morning-update-${reportData.date}.png`
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate image');
            }

            const blob = await response.blob();
            setImageBlob(blob);

            // Create URL for preview
            const url = URL.createObjectURL(blob);
            setImageUrl(url);

            toast.success('Report generated successfully!');
        } catch (error) {
            console.error('Error generating image:', error);
            toast.error('Failed to generate report', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsGenerating(false);
            handleDownload()
        }
    };

    const handleShare = async () => {
        if (!imageBlob) {
            toast.error('No image to share. Please wait for generation.');
            return;
        }

        try {
            const file = new File([imageBlob], `morning-update-${reportData.date}.png`, {
                type: 'image/png'
            });

            const nav: any = typeof navigator !== "undefined" ? navigator : undefined;
            if (nav && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
                await nav.share({
                    files: [file],
                    title: 'Morning Update Report',
                    text: `Morning Update Report - ${reportData.date}`
                });
                toast.success("Report shared successfully");
            } else {
                // Fallback: Download the image
                handleDownload();
            }
        } catch (err) {
            console.error(err);
            if ((err as Error).name !== 'AbortError') {
                toast.error("Failed to share report", { description: String(err) });
            }
        }
    };

    const handleDownload = () => {
        if (!imageUrl) {
            toast.error('No image to download. Please wait for generation.');
            return;
        }

        try {
            const a = document.createElement("a");
            a.href = imageUrl;
            a.download = `morning-update-${reportData.date}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success("Report downloaded successfully");
        } catch (err) {
            console.error(err);
            toast.error("Failed to download report", { description: String(err) });
        }
    };

    const handleClose = () => {
        // Cleanup
        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
        }
        setImageBlob(null);
        setImageUrl(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Morning Update Report</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Loading State */}
                    {isGenerating && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Generating report image...</p>
                        </div>
                    )}

                    {/* Image Preview */}
                    {!isGenerating && imageUrl && (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="border rounded-lg overflow-hidden shadow-lg max-w-full">
                                <img
                                    src={imageUrl}
                                    alt="Morning Update Report"
                                    className="w-full h-auto"
                                    style={{ maxHeight: '70vh', objectFit: 'contain' }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Preview of the generated report. Use the buttons below to share or download.
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {!isGenerating && !imageUrl && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <p className="text-sm text-muted-foreground">Failed to generate report image.</p>
                            <Button onClick={generateImage} variant="outline">
                                Try Again
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isGenerating}
                    >
                        Close
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDownload}
                            disabled={isGenerating || !imageBlob}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </Button>
                        <Button
                            type="button"
                            onClick={handleShare}
                            disabled={isGenerating || !imageBlob}
                        >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MorningUpdateReport;
