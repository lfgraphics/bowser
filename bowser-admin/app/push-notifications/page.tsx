"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadExcel } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { BASE_URL } from "@/lib/api";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types/auth";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

import OnlyAllowed from "@/components/OnlyAllowed";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Loading from "../loading";

type Vehicle = {
    VehicleNo: string;
    _id: string;
    name: string;
    tripDetails: {
        _id: string;
        driver: { name: string; mobile: string, isRegistered: boolean };
    };
};
type BowserDriver = {
    roles: [{ _id: string, name: string }]; id: string; name: string; phoneNumber: string
};
type Role = "admin" | "diesel" | "bowser";

const createExcelData = ({
    vehicles,
    bowserDrivers,
    users,
}: { vehicles: Vehicle[], bowserDrivers: BowserDriver[], users: User[] }) => {
    let data: any[] = [];
    let columns: { label: string, value: string }[] = [];
    let sheet = "";

    if (vehicles.length > 0) {
        sheet = "Vehicles";
        columns = [
            { label: "SN", value: "SN" },
            { label: "Vehicle No", value: "Vehicle No" },
            { label: "Driver Name", value: "Driver Name" },
            { label: "Driver Phone", value: "Driver Phone" },
            { label: "Registered", value: "Registered" },
        ];
        data = vehicles.map((v, index) => ({
            "SN": index + 1,
            "Vehicle No": v.VehicleNo,
            "Driver Name": v?.tripDetails?.driver?.name,
            "Driver Phone": v?.tripDetails?.driver?.mobile,
            "Registered": v?.tripDetails?.driver?.isRegistered ? "Yes" : "No",
        }));
    } else if (bowserDrivers.length > 0) {
        sheet = "Bowser Drivers";
        columns = [
            { label: "SN", value: "SN" },
            { label: "Name", value: "Name" },
            { label: "Phone", value: "Phone" },
        ];
        data = bowserDrivers.map((d, index) => ({
            "SN": index + 1,
            "Name": d.name,
            "Phone": d.phoneNumber,
        }));
    } else if (users.length > 0) {
        sheet = "Users";
        columns = [
            { label: "SN", value: "SN" },
            { label: "Name", value: "Name" },
            { label: "User ID", value: "User ID" },
            { label: "Phone", value: "Phone" },
        ];
        data = users.map((u, index) => ({
            "SN": index + 1,
            "Name": u.name,
            "User ID": u.userId,
            "Phone": u.phoneNumber,
        }));
    }

    if (!data.length) return [];

    return [
        {
            sheet,
            columns,
            content: data,
        },
    ];
}

export default function PushNotificationsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role>("admin");
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [bowserDrivers, setBowserDrivers] = useState<BowserDriver[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [platform, setPlatform] = useState<"web" | "native">("native");
    const [openDialog, setOpenDialog] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [tab, setTab] = useState<Role>("diesel");
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit, setLimit] = useState(20); // Items per page

    useEffect(() => {
        const stored = localStorage.getItem("adminUser");
        try {
            setLoading(true);
            if (stored) {
                const u = JSON.parse(stored);
                setUser(u);
                // Set role based on user (adjust as per your logic)
                if (u.roles?.includes("Admin")) setRole("admin");
                else if (u.roles?.includes("Diesel")) setRole("diesel");
                else if (u.roles?.includes("Bowser")) setRole("bowser");
                console.log("detecrted roles: ", u.roles);
                setTab(
                    u.roles?.includes("BCC Authorized Officer") ? "bowser" : u.roles?.includes("Diesel Control Center Staff") ? "diesel" : u.roles?.includes("Admin") ? "admin" : "diesel"
                );
            }
        } catch (e) {
            console.error("Failed to parse user data from localStorage", e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch data for each tab
    useEffect(() => {
        setSelected([]);
        if (tab === "diesel") {
            if (!user || !user.userId) return;
            fetch(`${BASE_URL}/searchVehicleNumber/managed/${user?.userId}?page=${page}&limit=${limit}`)
                .then((res) => res.json())
                .then((data) => {
                    setVehicles(data.vehicles);
                    console.log("vehicles: ", data.vehicles);
                    setTotalPages(data.pagination.totalPages);
                    setTotalItems(data.pagination.totalItems);
                })
                .catch(() => toast({ variant: "destructive", description: "Failed to fetch vehicles" }));
        } else if (tab === "bowser") {
            if (bowserDrivers.length > 0) return;
            fetch(`${BASE_URL}/users`)
                .then((res) => res.json())
                .then((data) => { setBowserDrivers(data); console.log("bowserDrivers: ", data); })
                .catch(() => toast({ variant: "destructive", description: "Failed to fetch bowser drivers" }));
        } else if (tab === "admin") {
            if (users.length > 0 && vehicles?.length > 0) return;
            fetch(`${BASE_URL}/users`)
                .then((res) => res.json())
                .then((data) => setUsers(data))
                .catch(() => toast({ variant: "destructive", description: "Failed to fetch users" }));
        }
    }, [tab, user, page, limit]);

    // Handle send notification
    const handleSend = async () => {
        if (!selected.length || !title || !message) {
            toast({ variant: "destructive", description: "Please fill all fields and select at least one recipient." });
            return;
        }
        setLoading(true);
        try {
            const payload = {
                recipients: selected.map(number => ({ mobileNumber: number })),
                message,
                platform,
                options: { title },
            };
            const url = `${BASE_URL}/notifications/bulk-send`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to send notification");
            const data = await res.json();
            if (data.success) {
                toast({ variant: "default", description: "Notification sent successfully!" });
                setOpenDialog(false);
                setTitle("");
                setMessage("");
                setSelected([]);
            } else {
                const errorCount = data.errors?.length || 0;
                const successCount = data.results?.length || 0;
                toast({
                    variant: errorCount > 0 ? "destructive" : "default",
                    description: `${successCount} notifications sent, ${errorCount} failed.`
                });
            }
        } catch (e) {
            toast({ variant: "destructive", description: "Failed to send notification." });
        } finally {
            setLoading(false);
        }
    };

    // Render selection table based on tab
    function renderSelection() {
        if (tab === "diesel") {
            return (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SN</TableHead>
                            <TableHead>Select</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Driver</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Registered</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vehicles?.length > 0 && vehicles?.map((v, index) => (
                            <TableRow key={v._id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(v?.tripDetails?.driver?.mobile)}
                                        onChange={(e) => {
                                            setSelected((sel) =>
                                                e.target.checked
                                                    ? [...sel, v?.tripDetails?.driver?.mobile]
                                                    : sel.filter((id) => id !== v?.tripDetails?.driver?.mobile)
                                            );
                                        }}
                                    />
                                </TableCell>
                                <TableCell>{v.VehicleNo}</TableCell>
                                <TableCell>{v?.tripDetails?.driver?.name}</TableCell>
                                <TableCell>{v?.tripDetails?.driver?.mobile}</TableCell>
                                <TableCell>
                                    <Badge variant={v?.tripDetails?.driver?.isRegistered ? "succes" : "destructive"}>
                                        {v?.tripDetails?.driver?.isRegistered ? "Yes" : "No"}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableCaption>
                        <div className="flex items-center justify-between"></div>
                        <div>
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalItems)} of {totalItems} entries
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                            </Button>
                            <div className="limit flex items-center gap-2">
                                <Label htmlFor="limit">Limit</Label>
                                <Input className="w-32" id="limit" value={limit} type="number" onChange={(e) => { setLimit(Number(e.target.value)) }} />
                            </div>
                        </div>
                    </TableCaption>
                </Table >
            );
        }
        if (tab === "bowser") {
            return (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SN</TableHead>
                            <TableHead>Select</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bowserDrivers.filter(u => u.roles?.some(role => role.name === "Bowser Driver")).map((u, index) => (
                            <TableRow key={u.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(u.phoneNumber)}
                                        onChange={(e) => {
                                            setSelected((sel) =>
                                                e.target.checked
                                                    ? [...sel, u.phoneNumber]
                                                    : sel.filter((id) => id !== u.phoneNumber)
                                            );
                                        }}
                                    />
                                </TableCell>
                                <TableCell>{u.name}</TableCell>
                                <TableCell>{u.phoneNumber}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }
        if (tab === "admin") {
            return (
                <OnlyAllowed allowedRoles={["Admin"]}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SN</TableHead>
                                <TableHead>Select</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u, index) => (
                                <TableRow key={u.userId}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(u.phoneNumber)}
                                            onChange={(e) => {
                                                setSelected((sel) =>
                                                    e.target.checked
                                                        ? [...sel, u.phoneNumber]
                                                        : sel.filter((id) => id !== u.phoneNumber)
                                                );
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>{u.name}</TableCell>
                                    <TableCell>{u.phoneNumber}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </OnlyAllowed>
            );
        }
    }

    return (
        <div className="p-6">
            <Toaster />
            {loading && <Loading />}
            <h1 className="text-2xl font-bold mb-4">Send Push Notification</h1>
            <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as Role)}
                className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between"
            >
                <TabsList>
                    {(role === "admin" || role === "diesel") && (
                        <OnlyAllowed allowedRoles={["Admin", "Diesel Control Center Staff"]}>
                            <TabsTrigger value="diesel">Diesel Control Center</TabsTrigger>
                        </OnlyAllowed>
                    )}
                    {(role === "admin" || role === "bowser") && (
                        <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer"]}>
                            <TabsTrigger value="bowser">Bowser Control Center</TabsTrigger>
                        </OnlyAllowed>
                    )}
                    {role === "admin" &&
                        <OnlyAllowed allowedRoles={["Admin"]}>
                            <TabsTrigger value="admin">Admin</TabsTrigger>
                        </OnlyAllowed>
                    }
                </TabsList>
                <Button onClick={() => {
                    const filename = `${tab}-data-${new Date().toISOString().split('T')[0]}`;
                    downloadExcel(createExcelData({
                        vehicles: tab === "diesel" ? vehicles : [],
                        bowserDrivers: tab === "bowser" ? bowserDrivers : [],
                        users: tab === "admin" ? users : []
                    }), filename);
                }}>
                    Download as Excel
                </Button>
            </Tabs>
            <div className="mb-4">{renderSelection()}</div>
            <div className="flex gap-2 mb-4">
                <Button
                    disabled={selected.length === 0}
                    onClick={() => setOpenDialog(true)}
                >
                    Notify Selected
                </Button>
                <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Notification Title"
                    className="max-w-xs"
                />
                <Input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Notification Message"
                    className="max-w-xs"
                />
                <Select value={platform} onValueChange={(value) => setPlatform(value as "web" | "native")}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="native">Native</SelectItem>
                    </SelectContent>
                </Select>

                <AlertDialog open={openDialog} onOpenChange={setOpenDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Send Notification</AlertDialogTitle>
                            <AlertDialogDescription>
                                <div className="space-y-2">
                                    <div>To: {selected.length} recipient(s)</div>
                                    <div>Title: {title}</div>
                                    <div>Message: {message}</div>
                                    <div>Platform: {platform}</div>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction disabled={loading} onClick={handleSend}>
                                {loading ? "Sending..." : "Send"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}