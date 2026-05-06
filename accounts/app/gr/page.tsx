"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Loader2, FileText, RefreshCw, LayoutGrid, List } from "lucide-react";
import { UserNav } from "@/components/UserNav";
import { GRFilters } from "@/components/gr/GRFilters";
import { GRTable } from "@/components/gr/GRTable";
import { GRUpdateDialog } from "@/components/gr/GRUpdateDialog";
import { Button } from "@/components/ui/button";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function GrManagerDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [grs, setGrs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({
        total: 0,
        pendingCount: 0,
        page: 1,
        limit: 50,
        pages: 0
    });
    const [filters, setFilters] = useState({
        page: 1,
        limit: 50
    });
    const [selectedGR, setSelectedGR] = useState<any | null>(null);
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

    const fetchGrs = useCallback(async (currentFilters = filters) => {
        if (!session?.accessToken) return;
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams();
            Object.entries(currentFilters).forEach(([key, value]) => {
                const stringValue = String(value);
                if (value !== undefined && value !== null && stringValue !== "") {
                    queryParams.append(key, stringValue);
                }
            });

            const response = await fetch(`${BACKEND_URL}/accounts/api/gr?${queryParams.toString()}`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            });

            if (!response.ok) throw new Error("Failed to fetch GRs");
            const data = await response.json();
            
            // Handle paginated response
            setGrs(data.grs || []);
            if (data.pagination) {
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Error fetching GRs:", error);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated") {
            fetchGrs(filters);
        }
    }, [status, router, fetchGrs, filters]);

    const handleFilterChange = (newFilters: any) => {
        setFilters(prev => ({ ...newFilters, page: 1, limit: prev.limit })); // Keep current limit
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    const handleLimitChange = (newLimit: string) => {
        setFilters(prev => ({ ...prev, limit: parseInt(newLimit), page: 1 }));
    };

    const handleSelectGR = (gr: any) => {
        setSelectedGR(gr);
        setIsUpdateDialogOpen(true);
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-bg-950">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950 text-white pb-10">
            {/* Header */}
            <header className="border-b border-brand-border bg-brand-bg-900/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand-warning/20 p-2 rounded-lg">
                            <FileText className="w-6 h-6 text-brand-warning" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold italic tracking-tight">GR Dashboard</h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Logistics Management</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => fetchGrs(filters)}
                            disabled={isLoading}
                            className="text-slate-400 hover:text-white"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <UserNav />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-brand-bg-900/50 border-brand-border p-5 group hover:border-brand-primary/50 transition-all duration-300">
                        <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Total GRs</div>
                        <div className="text-3xl font-black text-white">{pagination.total}</div>
                    </Card>
                    <Card className="bg-brand-bg-900/50 border-brand-border p-5 border-l-4 border-l-brand-warning group hover:border-brand-warning/50 transition-all duration-300">
                        <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Pending Unloading</div>
                        <div className="text-3xl font-black text-brand-warning">
                            {pagination.pendingCount}
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <GRFilters onFilterChange={handleFilterChange} />

                {/* Table Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            Recent Goods Receipts
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />}
                        </h2>
                        
                        {/* Simple Pagination */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Per Page</span>
                                <Select value={pagination.limit.toString()} onValueChange={handleLimitChange}>
                                    <SelectTrigger className="h-8 w-[70px] bg-brand-bg-950/50 border-brand-border text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-brand-bg-900 border-brand-border text-white">
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="h-4 w-px bg-brand-border" />
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1 || isLoading}
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    className="bg-brand-bg-950/50 border-brand-border h-8 px-3"
                                >
                                    Previous
                                </Button>
                                <div className="text-xs text-slate-400 px-2 font-medium">
                                    Page {pagination.page} of {pagination.pages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.pages || isLoading}
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    className="bg-brand-bg-950/50 border-brand-border h-8 px-3"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>

                    <GRTable 
                        data={grs} 
                        onSelect={handleSelectGR} 
                    />

                    {/* Bottom Pagination */}
                    <div className="flex items-center justify-between pt-4 border-t border-brand-border/30">
                        <div className="text-xs text-slate-500">
                            Showing <span className="text-slate-300 font-medium">{grs.length}</span> of <span className="text-slate-300 font-medium">{pagination.total}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page <= 1 || isLoading}
                                onClick={() => handlePageChange(pagination.page - 1)}
                                className="bg-brand-bg-950/50 border-brand-border h-8 px-4"
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                    // Simple pagination logic for 5 pages
                                    let pageNum = 1;
                                    if (pagination.pages <= 5) {
                                        pageNum = i + 1;
                                    } else {
                                        if (pagination.page <= 3) pageNum = i + 1;
                                        else if (pagination.page >= pagination.pages - 2) pageNum = pagination.pages - 4 + i;
                                        else pageNum = pagination.page - 2 + i;
                                    }

                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={pagination.page === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`h-8 w-8 p-0 ${pagination.page === pageNum ? 'bg-brand-primary' : 'bg-brand-bg-950/50 border-brand-border'}`}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                                {pagination.pages > 5 && pagination.page < pagination.pages - 2 && (
                                    <span className="text-slate-600 px-1 text-xs">...</span>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page >= pagination.pages || isLoading}
                                onClick={() => handlePageChange(pagination.page + 1)}
                                className="bg-brand-bg-950/50 border-brand-border h-8 px-4"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Update Dialog */}
            <GRUpdateDialog 
                gr={selectedGR}
                open={isUpdateDialogOpen}
                onOpenChange={setIsUpdateDialogOpen}
                onUpdateSuccess={() => fetchGrs(filters)}
                session={session}
            />
        </div>
    );
}

// Minimal Card if not in ui
function Card({ children, className }: any) {
    return (
        <div className={`bg-slate-900 rounded-xl border border-slate-800 shadow-lg ${className}`}>
            {children}
        </div>
    );
}
