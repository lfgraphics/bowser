"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { DispensesRecord, User } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import Loading from "../loading";
import { Check, Eye, ListChecks, ListX, X } from "lucide-react";
import { BASE_URL } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";

const VehicleDispensesPage = ({ searchParams }: { searchParams: { tripNumber?: number, allocator: string, limit?: number } }) => {
  const tripNumber = searchParams.tripNumber;
  const allocator = searchParams.allocator;
  const recLimit = searchParams.limit;

  const [records, setRecords] = useState<DispensesRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState();
  const [currentPage, setCurrentPage] = useState(1);
  const [category, setCategory] = useState('all');
  const [filter, setFilter] = useState({ bowserNumber: "", driverName: "", tripSheetId: Number(tripNumber), verified: "all", vehicleNo: "" });
  const [sortBy, setSortBy] = useState("fuelingDateTime");
  const [order, setOrder] = useState("desc");
  const [localBowserNumber, setLocalBowserNumber] = useState("");
  const [localDriverName, setLocalDriverName] = useState("");
  const [localTripSheetId, setLocalTripSheetId] = useState<number | undefined>(tripNumber);
  const [localVehicleNo, setLocalVehicleNo] = useState("");
  const [limit, setLimit] = useState(recLimit || 20);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [user, setUser] = useState<User>()
  const { toast } = useToast();

  const checkAuth = () => {
    const authenticated = isAuthenticated();
    if (!authenticated) {
      window.location.href = '/login';
    }
  };
  useEffect(() => {
    checkAuth();
    setUser(JSON.parse(localStorage.getItem('adminUser')!))
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [currentPage, sortBy, order, filter, limit, verificationStatus, category, searchParams]);


  const fetchRecords = async () => {
    setLoading(true);
    try {
      let params = {
        allocator,
        page: currentPage,
        limit: limit,
        sortBy,
        order,
        bowserNumber: filter.bowserNumber,
        driverName: filter.driverName,
        tripSheetId: Number(filter.tripSheetId) || null,
        vehicleNo: filter.vehicleNo,
        verified: verificationStatus,
        category,
      };
      console.log('params: ', params)
      const response = await axios.get(`${BASE_URL}/listDispenses`, { params: params });
      console.log('records: ', response.data.records)

      setRecords(response.data.records);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
      setTotalRecords(response.data.totalRecords);
    } catch (error) {
      console.error("Error fetching records:", error);
      alert(error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    setLoading(true);
    try {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      };
      const timestamp: string = date.toLocaleDateString('en-IN', options);

      const filterDescription = `${filter.bowserNumber ? `Bowser-${filter.bowserNumber} ,` : ''}${filter.driverName ? `Driver-${filter.driverName} ,` : ''}${filter.tripSheetId ? `Trip Sheet-${filter.tripSheetId} ,` : ''}`; //${selectedDateRange != undefined && dateDescription}`;
      const filename = `Dispenses_data ${filterDescription} ${records.length}record${records.length > 1 ? "s" : ""}, downloaded at ${timestamp}.xlsx`;

      const response = await axios.get(`${BASE_URL}/listDispenses/export/excel`, {
        params: {
          bowserNumber: filter.bowserNumber,
          driverName: filter.driverName,
          tripSheetId: filter.tripSheetId,
          sortBy,
          order,
          limit,
        },
        responseType: "blob",
      });

      // Create a URL for the Blob and trigger the download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename); // Use the generated filename
      document.body.appendChild(link);
      link.click();
      link.remove(); // Clean up the link element
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exporting data.");
    } finally {
      setLoading(false);
    }
  };

  // Function to toggle selection of a row
  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => {
      const newSelectedRows = new Set(prev);
      if (newSelectedRows.has(id)) {
        newSelectedRows.delete(id); // Deselect if already selected
      } else {
        newSelectedRows.add(id); // Select if not selected
      }
      return newSelectedRows;
    });
  };
  const toggleSelectAll = async () => {
    if (selectAll) {
      setSelectedRows(new Set()); // Deselect all
    } else {
      const allRowIds = new Set(records.map(record => record._id.toString())); // Create a set of all row IDs
      setSelectedRows(allRowIds); // Select all
    }
    setSelectAll(!selectAll); // Toggle the select all state
  };

  const verifyOne = async (id: string) => {
    try {
      setLoading(true)
      let response = await axios.patch(`${BASE_URL}/listDispenses/verify/${id}`, { by: { id: user?.userId, name: user?.name } })
      if (response.status == 200) {
        setRecords((prevRecords) =>
          prevRecords.map((record) =>
            record._id === id ? { ...record, verified: { status: true } } : record
          )
        );
        toast({ title: response.data.heading, description: response.data.message, variant: "success" });
      }
    } catch (err) {
      if (err instanceof Error) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "An unknown error occurred", variant: "destructive" });
      }
    } finally {
      setLoading(false)
    }
  }

  const verifyMultiple = async () => {
    if (selectedRows.size === 0) {
      return;
    }

    const idsToVerify = Array.from(selectedRows).filter((id) => {
      const record = records.find((r) => r._id === id);
      return record && !record.verified;
    });

    if (idsToVerify.length === 0) {
      alert('no data to verify')
      return;
    }

    try {
      let response = await axios.post(`${BASE_URL}/listDispenses/verify/`, { ids: idsToVerify, by: { id: user?.userId, name: user?.name } });
      if (response.status === 200) {
        setRecords((prevRecords) =>
          prevRecords.map((record) =>
            idsToVerify.includes(record._id) ? { ...record, verified: { status: true } } : record
          )
        );
        toast({ title: response.data.heading, description: response.data.message, variant: "success" });
      }
    } catch (err) {
      if (err instanceof Error) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "An unknown error occurred", variant: "destructive" });
      }
    }
  };

  return (
    <div className="relative">
      {(loading || records.length < 1) && <Loading />}
      <Toaster />
      <div className="flex justify-between items-start pt-8">
        <h1 className="mb-4 font-bold text-2xl">Dispense Records</h1>
      </div>
      <div className="lg:block top-0 z-10 sticky hidden bg-background pb-2 bigScreen">
        <div className="flex sm:flex-row flex-col justify-between gap-3 sm:space-x-2 space-y-2 sm:space-y-0 mb-4">
          {/* Sort By Dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="flex justify-between items-center p-2 border rounded w-full">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fuelingDateTime">
                Sort by Fueling Time
              </SelectItem>
              <SelectItem value="vehicleNumber">
                Sort by Vehicle Number
              </SelectItem>
              <SelectItem value="bowser.regNo">
                Sort by Bowser Number
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Order Dropdown */}
          <Select value={order} onValueChange={setOrder}>
            <SelectTrigger className="flex justify-between items-center p-2 border rounded w-full">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending</SelectItem>
              <SelectItem value="asc">Ascending</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={setVerificationStatus}>
            <SelectTrigger className="flex justify-between items-center p-2 border rounded w-full">
              <SelectValue placeholder="Verification Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Verified</SelectItem>
              <SelectItem value="false">Unverified</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={setCategory}>
            <SelectTrigger className="flex justify-between items-center p-2 border rounded w-full">
              <SelectValue className="text-muted" placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Own">Own</SelectItem>
              <SelectItem value="Attatch">Attatch</SelectItem>
              <SelectItem value="Bulk Sale">Bulk Sale</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex justify-between items-center min-w-[200px]">
            Records limit{" "}
            <Input
              type="number"
              className="ml-4 w-20"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            ></Input>{" "}
          </div>
        </div>
        <div className="flex sm:flex-row flex-col flex-wrap justify-between gap-3 sm:space-x-2 space-y-2 sm:space-y-0 mb-4">
          <Input
            placeholder="Filter by Bowser Number"
            value={localBowserNumber}
            onChange={(e) => setLocalBowserNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setFilter({ ...filter, bowserNumber: localBowserNumber });
              }
            }}
            className="w-full sm:w-auto"
          />
          <Input
            placeholder="Filter by Driver Name"
            value={localDriverName}
            onChange={(e) => setLocalDriverName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setFilter({ ...filter, driverName: localDriverName });
              }
            }}
            className="w-full sm:w-auto"
          />
          {/* <DatePickerWithRange onDateChange={handleDateChange} /> */}
          <div className="flex justify-between items-center">
            <Input
              placeholder="Filter by Trip Sheet Id/ Number"
              value={localTripSheetId}
              onChange={(e) => setLocalTripSheetId(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setFilter({
                    ...filter,
                    tripSheetId: Number(localTripSheetId),
                  });
                }
              }}
              className="w-full sm:w-auto"
            />
          </div>
          <div className="flex justify-between items-center">
            <Input
              placeholder="Filter by Vehicle Number"
              value={localVehicleNo}
              onChange={(e) => setLocalVehicleNo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setFilter({ ...filter, vehicleNo: localVehicleNo });
                }
              }}
              className="w-full sm:w-auto"
            />
          </div>
          <div className="flex justify-between items-center font-[200] text-muted-foreground">
            {records.length} out of {totalRecords} records{" "}
          </div>
          <Button variant="outline" onClick={toggleSelectAll}>
            {selectAll ? <ListX size={32} /> : <ListChecks size={32} />}
          </Button>
          <Button
            disabled={!(selectedRows.size > 0)}
            variant="outline"
            onClick={verifyMultiple}
          >
            Verify Selected Records
          </Button>
          <Button disabled variant="outline" onClick={verifyMultiple}>
            Post to tally
          </Button>
          <Button onClick={exportToExcel} className="w-full sm:w-auto">
            Export to Excel
          </Button>
        </div>
      </div>
      <Accordion
        type="single"
        collapsible
        className="block top-0 z-10 lg:hidden bg-background py-2 smallScreen"
      >
        <AccordionItem value="item-1">
          <AccordionTrigger>Filters and sorting</AccordionTrigger>
          <AccordionContent>
            <div className="flex sm:flex-row flex-col flex-wrap gap-3 sm:space-x-2 space-y-2 sm:space-y-0 mb-4 w-full">
              {/* Sort By Dropdown */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex justify-between items-center p-2 border rounded w-full self-center">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuelingDateTime">
                    Sort by Fueling Time
                  </SelectItem>
                  <SelectItem value="vehicleNumber">
                    Sort by Vehicle Number
                  </SelectItem>
                  <SelectItem value="bowser.regNo">
                    Sort by Bowser Number
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Order Dropdown */}
              <Select value={order} onValueChange={setOrder}>
                <SelectTrigger className="flex justify-between items-center p-2 border rounded w-full self-center">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={setVerificationStatus}>
                <SelectTrigger className="flex justify-between items-center p-2 border rounded w-full self-center">
                  <SelectValue placeholder="Verification Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Verified</SelectItem>
                  <SelectItem value="false">Unverified</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={setCategory}>
                <SelectTrigger className="flex justify-between items-center p-2 border rounded w-full">
                  <SelectValue
                    className="text-muted"
                    placeholder="Fueling Type"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Own">Own</SelectItem>
                  <SelectItem value="Attatch">Attatch</SelectItem>
                  <SelectItem value="Bulk Sale">Bulk Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex sm:flex-row flex-col flex-wrap justify-between gap-3 sm:space-x-2 space-y-2 sm:space-y-0 mb-4">
              <Input
                placeholder="Filter by Bowser Number"
                value={localBowserNumber}
                onChange={(e) => setLocalBowserNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setFilter({ ...filter, bowserNumber: localBowserNumber });
                  }
                }}
                className="w-full sm:w-auto"
              />
              <Input
                placeholder="Filter by Driver Name"
                value={localDriverName}
                onChange={(e) => setLocalDriverName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setFilter({ ...filter, driverName: localDriverName });
                  }
                }}
                className="w-full sm:w-auto"
              />
              <Input
                placeholder="Filter by Vehicle Number"
                value={localVehicleNo}
                onChange={(e) => setLocalVehicleNo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setFilter({ ...filter, vehicleNo: localVehicleNo });
                  }
                }}
                className="w-full sm:w-auto"
              />
              <Input
                placeholder="Filter by Trip Sheet Id/ Number"
                value={localTripSheetId}
                onChange={(e) => setLocalTripSheetId(Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setFilter({
                      ...filter,
                      tripSheetId: Number(localTripSheetId),
                    });
                  }
                }}
                className="w-full sm:w-auto"
              />
              <div className="flex justify-between items-center min-w-[200px] max-w-full">
                Records limit{" "}
                <Input
                  type="number"
                  className="w-20"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                ></Input>{" "}
              </div>
              <div className="flex justify-between items-center font-[200] text-gray-300">
                Total found record{records.length > 1 ? "s" : ""}{" "}
                {records.length} out of {totalRecords} records{" "}
              </div>
              <Button onClick={exportToExcel} className="w-full sm:w-auto">
                Export to Excel
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Table className="w-max min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead>S N</TableHead>
            <TableHead>Trip Sheet Id</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Party/Vendor</TableHead>
            <TableHead>Fueling Time</TableHead>
            <TableHead>Bowser No.</TableHead>
            <TableHead>Bowser Location</TableHead>
            <TableHead>Driver/Manager</TableHead>
            <TableHead>Phone No.</TableHead>
            <TableHead>Vehicle Number</TableHead>
            <TableHead>Odo Meter</TableHead>
            <TableHead>Qty Type</TableHead>
            <TableHead>Fuel Qty</TableHead>
            <TableHead>View</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Posted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="h-[50%] overflow-y-scroll">
          {records.length > 0 &&
            records.map((record, index) => (
              <TableRow
                key={index}
                onClick={(e: React.MouseEvent<HTMLElement>) => {
                  const target = e.target as HTMLElement;
                  if (target.tagName !== "BUTTON") {
                    toggleRowSelection(`${record._id}`);
                  }
                }}
                className={
                  selectedRows.has(`${record._id}`)
                    ? "bg-blue-200 hover:bg-blue-100 text-black"
                    : ""
                }
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>{record.tripSheetId}</TableCell>
                <TableCell>{record.category}</TableCell>
                <TableCell>{record.party}</TableCell>
                <TableCell>{`${formatDate(
                  record.fuelingDateTime
                )}`}</TableCell>
                <TableCell>{record.bowser.regNo}</TableCell>
                <TableCell>
                  {record.location?.substring(0, 15) + "..."}
                </TableCell>
                <TableCell>{record.driverName}</TableCell>
                <TableCell>{record.driverMobile}</TableCell>
                <TableCell>{record.vehicleNumber}</TableCell>
                <TableCell>{record.odometer}</TableCell>
                <TableCell>{record.quantityType}</TableCell>
                <TableCell>{record.fuelQuantity}</TableCell>
                <TableCell className="flex items-center gap-2">
                  <Link href={`/dispense-records/${record._id}`}>
                    <Button
                      variant={
                        selectedRows.has(`${record._id}`)
                          ? "secondary"
                          : "outline"
                      }
                      size="sm"
                    >
                      <Eye />
                    </Button>
                  </Link>
                </TableCell>
                <TableCell>
                  {record.verified ? (<Check />) : (
                    <Button onClick={() => { verifyOne(String(record._id)) }} variant={selectedRows.has(`${record._id}`) ? "secondary" : "outline"} >
                      Verify
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {record.posted ? (
                    <Check />
                  ) : (
                      <X className="text-red-500 block mx-auto" />
                  )}
                </TableCell>
              </TableRow>
            ))}

          <TableRow>
            <TableCell colSpan={12} className="text-right font-bold">
              Total Fuel Quantity:
            </TableCell>
            <TableCell colSpan={2}>
              {records
                .reduce(
                  (total, record) => total + Number(record.fuelQuantity),
                  0
                )
                .toFixed(2)}{" "}
              L
            </TableCell>
            <TableCell
              colSpan={2}
              className="text-right font-bold"
            ></TableCell>
          </TableRow>
        </TableBody>
        <TableCaption>
          <div className="flex justify-between mt-4">
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </TableCaption>
      </Table>
    </div>
  );
};

export default VehicleDispensesPage;
