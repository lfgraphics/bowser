"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { FixedSizeList as List } from "react-window";

import { BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading from "@/app/loading";
import { formatDate } from "@/lib/utils";
import { generateTripsSimpleReport } from "@/utils/excel";

interface Trip {
  _id: string;
  StartDriver: string;
  VehicleNo: string;
  StartDate: string;
  StartFrom: string;
  EndTo: string;
  LoadStatus: number;
  LoadTripDetail?: {
    LoadDate?: string;
    LoadDetail: {
      LoadQty: number;
      UnloadQty: number;
      ShortQty: number;
      DeductionComment: string;
    };
  };
}

export default function Reporting() {
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    loadStatus: "1", // Loaded by default
    startFrom: "",
    type: "",
  });

  const fetchReport = async (customFilters = filters) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (customFilters.type) queryParams.append("type", customFilters.type);
      if (customFilters.startDate)
        queryParams.append("startDate", customFilters.startDate);
      if (customFilters.endDate)
        queryParams.append("endDate", customFilters.endDate);

      // If "All" is selected (empty string or 'all'), don't send loadStatus
      if (customFilters.loadStatus && customFilters.loadStatus !== "all") {
        queryParams.append("loadStatus", customFilters.loadStatus);
      }

      if (customFilters.startFrom)
        queryParams.append("startFrom", customFilters.startFrom);

      const response = await fetch(
        `${BASE_URL}/trans-app/reports/trips-report?${queryParams.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setTrips(data.trips);
        if (data.trips.length === 0) {
          toast.info("No trips found for the selected filters.");
        }
      } else {
        toast.error(data.error || "Failed to fetch report");
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error("An error occurred while fetching the report");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReport = (type: "today" | "yesterday") => {
    const newFilters = { ...filters, type, startDate: "", endDate: "" };
    setFilters(newFilters);
    fetchReport(newFilters);
  };

  const handleSearch = () => {
    const newFilters = { ...filters, type: "" };
    setFilters(newFilters);
    fetchReport(newFilters);
  };

  const exportToExcel = () => {
    if (trips.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const filterParts = [];
      if (filters.type) {
        filterParts.push(filters.type.toUpperCase());
      } else {
        if (filters.startDate)
          filterParts.push(moment(filters.startDate).format("DDMM"));
        if (filters.endDate)
          filterParts.push(`to_${moment(filters.endDate).format("DDMM")}`);
      }

      const statusMap: Record<string, string> = {
        "1": "LOADED",
        "0": "EMPTY",
        all: "ALL",
      };
      filterParts.push(statusMap[filters.loadStatus] || "ALL");

      if (filters.startFrom)
        filterParts.push(filters.startFrom.substring(0, 8).toUpperCase());

      const timestamp = moment().format("DDMMYY_HHmm");
      const fileName = `Trips_${filterParts.join("_")}_${timestamp}.xlsx`;

      generateTripsSimpleReport(trips, fileName);
      toast.success("Exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export to Excel");
    }
  };

  // Virtualized Row Renderer
  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const trip = trips[index];
    return (
      <div
        style={style}
        className="flex border-b hover:bg-muted/50 transition-colors items-center text-sm"
      >
        <div className="flex-[0.5] px-4 font-medium truncate">
          {index + 1}
        </div>
        <div className="flex-[1.5] px-4 font-medium truncate">
          {trip.VehicleNo}
        </div>
        <div className="flex-[1.5] px-4 truncate">
          {formatDate(trip.StartDate)}
        </div>
        <div className="flex-2 px-4 truncate">{trip.StartFrom}</div>
        <div className="flex-2 px-4 truncate">{trip.EndTo}</div>
        <div className="flex-1 px-4 truncate">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${trip.LoadStatus === 1
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
              }`}
          >
            {trip.LoadStatus === 1 ? "Loaded" : "Empty"}
          </span>
        </div>
        <div className="flex-2 px-4 truncate">{trip.StartDriver || "-"}</div>
        <div className="flex-1 px-4 truncate">
          {trip.LoadTripDetail?.LoadDetail.LoadQty || "-"}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Trips Reporting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col gap-2">
              <Label>Quick Reports</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleQuickReport("today")}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleQuickReport("yesterday")}
                >
                  Yesterday
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="loadStatus">Load Status</Label>
              <Select
                value={filters.loadStatus}
                onValueChange={(v) => setFilters({ ...filters, loadStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">Loaded</SelectItem>
                  <SelectItem value="0">Empty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="startFrom">Loaded From</Label>
              <Input
                id="startFrom"
                placeholder="Search origin..."
                value={filters.startFrom}
                onChange={(e) =>
                  setFilters({ ...filters, startFrom: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 lg:col-span-3 xl:col-span-1">
              <Button className="flex-1" onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" /> Search
              </Button>
              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={trips.length === 0}
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Loading />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="flex bg-muted/50 border-b font-semibold text-sm py-3">
              <div className="flex-[0.5] px-4">SN.</div>
              <div className="flex-[1.5] px-4">Vehicle No</div>
              <div className="flex-[1.5] px-4">Start Date</div>
              <div className="flex-2 px-4">Origin</div>
              <div className="flex-2 px-4">Destination</div>
              <div className="flex-1 px-4">Status</div>
              <div className="flex-2 px-4">Driver</div>
              <div className="flex-1 px-4">Qty</div>
            </div>

            {/* Virtualized List */}
            {trips.length > 0 ? (
              <List
                height={600}
                itemCount={trips.length}
                itemSize={50}
                width="100%"
              >
                {Row}
              </List>
            ) : (
              <div className="text-center py-20 text-muted-foreground bg-background">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No trips found for the selected filters.</p>
                <p className="text-xs">
                  Try adjusting your search criteria or quick filters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
