"use client";

import { useState } from "react";
import { Search, Filter, X, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";

interface GRFiltersProps {
    onFilterChange: (filters: any) => void;
}

export function GRFilters({ onFilterChange }: GRFiltersProps) {
    const [filters, setFilters] = useState({
        search: "",
        status: "",
        minQty: "",
        maxQty: "",
        sortBy: "loadingDate",
        sortOrder: "desc",
        loadingDateFrom: "",
        loadingDateTo: "",
    });

    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleSelectChange = (name: string, value: string) => {
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        const cleared = {
            search: "",
            status: "",
            minQty: "",
            maxQty: "",
            sortBy: "loadingDate",
            sortOrder: "desc",
            loadingDateFrom: "",
            loadingDateTo: "",
        };
        setFilters(cleared);
        onFilterChange(cleared);
    };

    const toggleSortOrder = () => {
        const newOrder = filters.sortOrder === "asc" ? "desc" : "asc";
        const newFilters = { ...filters, sortOrder: newOrder };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    return (
        <Card className="bg-brand-bg-900/40 border-brand-border backdrop-blur-xl mb-6">
            <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                name="search"
                                value={filters.search}
                                onChange={handleChange}
                                placeholder="Search GR No, Vehicle, Consignee..."
                                className="w-full bg-brand-bg-950/50 border border-brand-border rounded-md pl-10 pr-4 py-2 text-white placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-brand-primary/50 transition-all"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <Select
                                value={filters.status}
                                onValueChange={(v) => handleSelectChange("status", v)}
                            >
                                <SelectTrigger className="w-[130px] bg-brand-bg-950/50 border-brand-border text-white">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-brand-bg-900 border-brand-border text-white">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="unloaded">Unloaded</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.sortBy}
                                onValueChange={(v) => handleSelectChange("sortBy", v)}
                            >
                                <SelectTrigger className="w-[160px] bg-brand-bg-950/50 border-brand-border text-white">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent className="bg-brand-bg-900 border-brand-border text-white">
                                    <SelectItem value="loadingDate">Sort by Loading</SelectItem>
                                    <SelectItem value="unloadingDate">Sort by Unloading</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={toggleSortOrder}
                                className="border-brand-border text-slate-300 h-9 w-9"
                                title={`Sort ${filters.sortOrder === "asc" ? "Ascending" : "Descending"}`}
                            >
                                <ArrowUpDown className={`w-4 h-4 ${filters.sortOrder === "asc" ? "rotate-180" : ""} transition-transform`} />
                            </Button>
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="border-brand-border text-slate-300 hover:bg-brand-bg-800"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            {isExpanded ? "Less" : "More"}
                        </Button>
                        
                        {(Object.values(filters).some(v => v !== "" && v !== "loadingDate" && v !== "desc")) && (
                            <Button
                                variant="ghost"
                                onClick={clearFilters}
                                className="text-slate-400 hover:text-white px-2"
                            >
                                <X className="w-4 h-4 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>

                    {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-brand-border mt-2 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-400 uppercase tracking-wider">Min Quantity</Label>
                                <Input
                                    type="number"
                                    name="minQty"
                                    value={filters.minQty}
                                    onChange={handleChange}
                                    placeholder="0"
                                    className="bg-brand-bg-950/50 border-brand-border text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-400 uppercase tracking-wider">Max Quantity</Label>
                                <Input
                                    type="number"
                                    name="maxQty"
                                    value={filters.maxQty}
                                    onChange={handleChange}
                                    placeholder="99999"
                                    className="bg-brand-bg-950/50 border-brand-border text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-400 uppercase tracking-wider">Date From</Label>
                                <Input
                                    type="date"
                                    name="loadingDateFrom"
                                    value={filters.loadingDateFrom}
                                    onChange={handleChange}
                                    className="bg-brand-bg-950/50 border-brand-border text-xs w-full block"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-400 uppercase tracking-wider">Date To</Label>
                                <Input
                                    type="date"
                                    name="loadingDateTo"
                                    value={filters.loadingDateTo}
                                    onChange={handleChange}
                                    className="bg-brand-bg-950/50 border-brand-border text-xs w-full block"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
