"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type Vehicle = {
    VehicleNo: string;
    _id: string;
    name: string;
    driver: { ITPLId: string; name: string; phoneNumber: string };
};
type BowserDriver = {
    roles: [{ _id: string, name: string }]; id: string; name: string; phoneNumber: string
};
type Role = "admin" | "diesel" | "bowser";

export default function PushNotificationsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role>("admin");
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [bowserDrivers, setBowserDrivers] = useState<BowserDriver[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [platform, setPlatform] = useState<"web" | "native">("web");
    const [openDialog, setOpenDialog] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [tab, setTab] = useState<Role>("diesel");
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit, setLimit] = useState(20); // Items per page

    useEffect(() => {
        const stored = localStorage.getItem("adminUser");
        if (stored) {
            const u = JSON.parse(stored);
            setUser(u);
            // Set role based on user (adjust as per your logic)
            if (u.roles?.includes("Admin")) setRole("admin");
            else if (u.roles?.includes("Diesel")) setRole("diesel");
            else if (u.roles?.includes("Bowser")) setRole("bowser");
            setTab(
                u.roles?.includes("Admin") ? "admin" : u.roles?.includes("Diesel") ? "diesel" : "bowser"
            );
        }
    }, []);

    // Fetch data for each tab
    useEffect(() => {
        setSelected([]);
        if (tab === "diesel") {
            if (vehicles?.length > 0) return;
            fetch(`${BASE_URL}/searchVehicleNumber/managed/${user?.userId}?page=${page}&limit=${limit}`)
                .then((res) => res.json())
                .then((data) => {
                    setVehicles(data.vehicles);
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
            fetch(`${BASE_URL}/vehicle`)
                .then((res) => res.json())
                .then((data) => setVehicles(data))
                .catch(() => toast({ variant: "destructive", description: "Failed to fetch vehicles" }));
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
                recipients: selected,
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
            toast({ variant: "default", description: "Notification sent!" });
            setOpenDialog(false);
            setTitle("");
            setMessage("");
            setSelected([]);
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
                            <TableHead>Select</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Driver</TableHead>
                            <TableHead>Phone</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vehicles?.length > 0 && vehicles?.map((v, index) => (
                            <TableRow key={v._id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(v?.driver?.phoneNumber)}
                                        onChange={(e) => {
                                            setSelected((sel) =>
                                                e.target.checked
                                                    ? [...sel, v?.driver?.phoneNumber]
                                                    : sel.filter((id) => id !== v?.driver?.phoneNumber)
                                            );
                                        }}
                                    />
                                </TableCell>
                                <TableCell>{v.VehicleNo}</TableCell>
                                <TableCell>{v?.driver?.name}</TableCell>
                                <TableCell>{v?.driver?.phoneNumber}</TableCell>
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
                </Table>
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
        // Admin: show users and vehicles in tabs
        return (
            <Tabs defaultValue="users" className="w-full">
                <TabsList>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                </TabsList>
                <TabsContent value="users">
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
                </TabsContent>
                <TabsContent value="vehicles">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SN</TableHead>
                                <TableHead>Select</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Phone</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles?.length > 0 && vehicles.map((v, index) => (
                                <TableRow key={v._id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="checkbox"
                                            checked={selected.includes(v?.driver?.phoneNumber)}
                                            onChange={(e) => {
                                                setSelected((sel) =>
                                                    e.target.checked
                                                        ? [...sel, v?.driver?.phoneNumber]
                                                        : sel.filter((id) => id !== v?.driver?.phoneNumber)
                                                );
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>{v.name}</TableCell>
                                    <TableCell>{v?.driver?.name}</TableCell>
                                    <TableCell>{v?.driver?.phoneNumber}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Send Push Notification</h1>
            <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as Role)}
                className="mb-4"
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
                <select
                    value={platform}
                    onChange={(e) =>
                        setPlatform(e.target.value as "web" | "native")
                    }
                >
                    <option value="web">Web</option>
                    <option value="native">Native</option>
                </select>
            </div>
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
    );
}