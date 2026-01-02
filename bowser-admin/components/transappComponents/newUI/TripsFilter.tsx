import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TripsFilterProps {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    sortBy: string;
    setSortBy: (value: string) => void;
    direction: string;
    setDirection: (value: string) => void;
    page: number;
    setPage: (value: number) => void;
    pageSize: number;
    setPageSize: (value: number) => void;
    pagination?: {
        currentPage: number;
        totalPages: number;
        pageSize: number;
        hasMore: boolean;
    };
    className?: string;
}

export const TripsFilter = ({
    searchTerm, setSearchTerm,
    sortBy, setSortBy,
    direction, setDirection,
    page, setPage,
    pageSize, setPageSize,
    pagination,
    className
}: TripsFilterProps) => {

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset to page 1 on search
    };

    const handleSortChange = (value: string) => {
        setSortBy(value);
        setPage(1); // Reset to page 1 on sort change
    };

    return (
        <div className={cn(
            "flex flex-col items-center justify-between gap-4 py-2 px-2 w-full bg-background",
            className
        )}>
            {/* Left/Center Group: Search */}
            <div className="flex-1 max-w-md min-w-full pt-2">
                <Input
                    placeholder="Search Vehicle, Location, Loading Supervisor..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="h-9 rounded-full border-muted-foreground/20 bg-muted/30 focus-within:border-yellow-500/50 transition-all text-sm"
                />
            </div>
            {/* Right Group: Sort & Pagination */}
            <div className="flex items-center gap-3 md:gap-6 flex-nowrap overflow-visible">
                {/* Sort Group */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground opacity-40 hidden lg:inline">Sort:</span>
                    <div className="flex items-center gap-1.5 bg-muted/20 rounded-full p-0.5 border border-muted-foreground/10">
                        <Select value={sortBy} onValueChange={handleSortChange}>
                            <SelectTrigger className="w-[120px] sm:w-[150px] h-7 rounded-full border-none bg-transparent hover:bg-background/50 transition-all text-xs font-semibold focus:ring-0">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="VehicleNo">Vehicle No</SelectItem>
                                <SelectItem value="StartFrom">Start Location</SelectItem>
                                <SelectItem value="EndTo">Ending Location</SelectItem>
                                <SelectItem value="StartDate">Start Date</SelectItem>
                                <SelectItem value="EndDate">End Date</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-500 transition-all"
                            onClick={() => {
                                setDirection(direction === 'asc' ? 'desc' : 'asc');
                                setPage(1);
                            }}
                        >
                            {direction === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                            ) : (
                                <ArrowDown className="h-3 w-3" />
                            )}
                        </Button>
                    </div>
                </div>
                
                {/* Page Size Group */}
                <div className="flex items-center gap-2 border-l border-muted-foreground/10 pl-3">
                    <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}>
                        <SelectTrigger className="w-[65px] h-7 rounded-full border-muted-foreground/20 bg-muted/20 text-[10px] font-black focus:ring-0 px-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl min-w-[70px]">
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Pagination Group */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center gap-2 md:gap-4 shrink-0 border-l border-muted-foreground/10 pl-3 md:pl-6">
                        <div className="flex items-center gap-2 text-[10px] font-black">
                            <span className="text-yellow-500">{pagination.currentPage}</span>
                            <span className="opacity-30">/</span>
                            <span className="opacity-50">{pagination.totalPages}</span>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-full px-3 text-[10px] font-black border-muted-foreground/20 hover:text-yellow-500 hover:border-yellow-500/50 transition-all disabled:opacity-20"
                                disabled={pagination.currentPage <= 1}
                                onClick={() => setPage(Math.max(1, page - 1))}
                            >
                                PREV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-full px-3 text-[10px] font-black border-muted-foreground/20 hover:text-yellow-500 hover:border-yellow-500/50 transition-all disabled:opacity-20"
                                disabled={!pagination.hasMore}
                                onClick={() => setPage(page + 1)}
                            >
                                NEXT
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
