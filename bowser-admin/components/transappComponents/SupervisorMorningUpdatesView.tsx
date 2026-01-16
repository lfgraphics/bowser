"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { DateRange } from "react-day-picker";

import { BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/DatePickerWithRange';
import { TankersTrip } from '@/types';
import { toProperTitleCase } from '@/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

type MorningUpdateData = {
  _id: string;
  user: {
    _id: string;
    name: string;
  };
  openingTime: string;
  closingTime: string;
  report: Array<{
    vehicleNo: string;
    location: string;
    remark: string;
    trip?: TankersTrip;
    driver?: string;
  }>;
};

type GroupedUpdates = {
  [date: string]: MorningUpdateData[];
};

type Props = {
  userId?: string;
  className?: string;
};

export default function SupervisorMorningUpdatesView({ userId, className = "" }: Props) {
  const [morningUpdates, setMorningUpdates] = useState<MorningUpdateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedUpdates, setExpandedUpdates] = useState<Record<string, boolean>>({});

  // Group updates by date
  const groupedUpdates = useMemo<GroupedUpdates>(() => {
    const groups: GroupedUpdates = {};

    morningUpdates.forEach(update => {
      if (!update.closingTime) {
        return;
      }

      const dateObj = new Date(update.closingTime);
      if (isNaN(dateObj.getTime())) {
        return;
      }

      const date = dateObj.toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(update);
    });

    // Sort dates in descending order
    const sortedGroups: GroupedUpdates = {};
    Object.keys(groups)
      .sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .forEach(date => {
        sortedGroups[date] = groups[date].sort(
          (a, b) => {
            const dateA = new Date(a.closingTime);
            const dateB = new Date(b.closingTime);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
            return dateB.getTime() - dateA.getTime();
          }
        );
      });

    return sortedGroups;
  }, [morningUpdates]);

  // Fetch morning updates
  const fetchMorningUpdates = async (page = 1, resetData = false) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (dateRange?.from) {
        params.set('startDate', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.set('endDate', dateRange.to.toISOString());
      }

      const response = await fetch(`${BASE_URL}/morning-update/user/${userId}?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.table(data.data);

      if (resetData || page === 1) {
        setMorningUpdates(data.data || []);
      } else {
        setMorningUpdates(prev => [...prev, ...(data.data || [])]);
      }

      setCurrentPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.totalRecords || 0);

    } catch (error) {
      console.error('Error fetching morning updates:', error);
      toast.error('Failed to fetch morning updates');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMorningUpdates(1, true);
  }, [pageSize, dateRange, userId]);

  // Toggle section expansion
  const toggleSection = (date: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Toggle update expansion
  const toggleUpdate = (updateId: string) => {
    setExpandedUpdates(prev => ({
      ...prev,
      [updateId]: !prev[updateId]
    }));
  };

  // Load more data
  const loadMore = () => {
    if (currentPage < totalPages && !loading) {
      fetchMorningUpdates(currentPage + 1, false);
    }
  };

  const formatRemark = (remark: string): string => {
    if (!remark) return 'No remark provided';
    const trimmed = remark.trim();
    if (trimmed.toLowerCase().includes('reported')) {
      return 'Vehicle reported and unloaded';
    }
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const getPlannedFor = (location: string): string => {
    if (!location) return 'N/A';
    const parts = location.split(':');
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return 'N/A';
  };

  const getCurrentlyAt = (location: string): string => {
    if (!location) return 'N/A';
    const parts = location.split(':');
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return parts[0].trim();
  };

  const formatDisplayDate = (dateString: string): string => {
    try {
      if (!dateString) return 'Unknown Date';

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

      if (dateOnly.getTime() === todayOnly.getTime()) {
        return 'Today';
      } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
        return 'Yesterday';
      }

      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      <Accordion type="single" defaultValue="filters" collapsible>
        <AccordionItem value="filters">
          <AccordionTrigger className="px-6 py-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className='px-6 pb-6'>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <DatePickerWithRange
                    onDateChange={setDateRange}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-size">Items per page</Label>
                  <select
                    id="page-size"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total Records: {totalRecords}</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Morning Updates by Date */}
      <div className="space-y-4">
        {Object.keys(groupedUpdates).length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No morning updates found for the selected criteria.</p>
            </CardContent>
          </Card>
        )}

        {Object.entries(groupedUpdates).map(([date, updates]) => (
          <Card key={date} className='gap-0'>
            <CardHeader
              className="hover:bg-muted cursor-pointer pt-2"
              onClick={() => toggleSection(date)}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>{formatDisplayDate(date)}</span>
                </div>
                {expandedSections[date] !== false ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </CardTitle>
            </CardHeader>

            {expandedSections[date] !== false && (
              <CardContent className="space-y-3">
                {updates.map((update) => (
                  <Card key={update._id} className='border-none'>
                    {/* <CardHeader
                      className="hover:bg-muted cursor-pointer py-3"
                      onClick={() => toggleUpdate(update._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">Vehicle Report</span>
                          <Badge variant="outline">{update.report.length} vehicles</Badge>
                        </div>
                        {expandedUpdates[update._id] ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </CardHeader>

                    {expandedUpdates[update._id] && (
                    )} */}

                    <CardContent className="pt-0">
                      <div className="rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="font-semibold">Sr No.</TableHead>
                              <TableHead className="font-semibold">Vehicle No.</TableHead>
                              <TableHead className="font-semibold">Planned For</TableHead>
                              <TableHead className="font-semibold">At</TableHead>
                              <TableHead className="font-semibold">Unloaded At</TableHead>
                              <TableHead className="font-semibold">Remark</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {update.report.map((vehicle, index) => (
                              <TableRow key={`${vehicle.vehicleNo}-${index}`} className="hover:bg-muted/30">
                                <TableCell className="font-medium text-center">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="font-bold text-primary">
                                  {vehicle.vehicleNo}
                                </TableCell>
                                <TableCell>
                                  {getPlannedFor(vehicle.trip?.EndTo!)}
                                </TableCell>
                                <TableCell>
                                  {getCurrentlyAt(toProperTitleCase(vehicle.location))}
                                </TableCell>
                                <TableCell>
                                  {toProperTitleCase(vehicle.trip?.StartFrom!)}
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div className="truncate" title={formatRemark(vehicle.remark)}>
                                    {formatRemark(vehicle.remark)}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Load More Button */}
      {currentPage < totalPages && (
        <div className="text-center">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            className="w-full md:w-auto"
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && morningUpdates.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading morning updates...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
