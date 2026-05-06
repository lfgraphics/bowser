"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Edit, Trash2, Users, Shield, AlertCircle, Lock } from "lucide-react";
import { UserForm } from "@/components/admin/UserForm";
import { UserNav } from "@/components/UserNav";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface User {
    _id: string;
    userId: string;
    name: string;
    email?: string;
    role: string;
    isActive: boolean;
    permissions: string[];
    validTill?: string;
    createdAt: string;
}

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formError, setFormError] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [passwordValue, setPasswordValue] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(30);
    const [search, setSearch] = useState("");
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated") {
            fetchUsers(page, limit, search);
        }
    }, [status, router, page, limit, search]);

    const fetchUsers = async (pageValue: number, limitValue: number, searchValue: string) => {
        try {
            const params = new URLSearchParams();
            params.set("page", String(pageValue));
            params.set("limit", String(limitValue));
            if (searchValue) {
                params.set("search", searchValue);
            }

            const response = await fetch(`${BACKEND_URL}/account-auth/users?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                },
            });

            if (response.status === 401) {
                await signOut({ callbackUrl: "/login?error=session-expired" });
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to fetch users");
            }

            const data = await response.json();
            setUsers(data.users);
            setTotalPages(data.pagination?.totalPages ?? 1);
            setTotalUsers(data.pagination?.totalUsers ?? data.users.length);
        } catch (err) {
            setError("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (formData: any) => {
        setFormError("");
        setFormSubmitting(true);

        try {
            const response = await fetch(`${BACKEND_URL}/account-auth/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.status === 401) {
                await signOut({ callbackUrl: "/login?error=session-expired" });
                return;
            }

            if (!response.ok) {
                setFormError(data.message || "Failed to create user");
                return;
            }

            setDialogOpen(false);
            setFormSubmitting(false);
            fetchUsers(page, limit, search);
        } catch (err) {
            setFormError("Failed to create user");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleUpdateUser = async (formData: any) => {
        if (!selectedUser) return;

        setFormError("");
        setFormSubmitting(true);

        try {
            const response = await fetch(`${BACKEND_URL}/account-auth/users/${selectedUser._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.status === 401) {
                await signOut({ callbackUrl: "/login?error=session-expired" });
                return;
            }

            if (!response.ok) {
                setFormError(data.message || "Failed to update user");
                return;
            }

            setEditDialogOpen(false);
            setSelectedUser(null);
            setFormSubmitting(false);
            fetchUsers(page, limit, search);
        } catch (err) {
            setFormError("Failed to update user");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        try {
            const response = await fetch(`${BACKEND_URL}/account-auth/users/${selectedUser._id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                },
            });

            const data = await response.json();

            if (response.status === 401) {
                await signOut({ callbackUrl: "/login?error=session-expired" });
                return;
            }

            if (!response.ok) {
                setError(data.message || "Failed to delete user");
                return;
            }

            setDeleteDialogOpen(false);
            setSelectedUser(null);
            fetchUsers(page, limit, search);
        } catch (err) {
            setError("Failed to delete user");
        }
    };

    const handleResetUserPassword = async () => {
        if (!selectedUser) return;

        setPasswordError("");
        setPasswordSubmitting(true);

        try {
            const response = await fetch(`${BACKEND_URL}/account-auth/users/${selectedUser._id}/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify({
                    newPassword: passwordValue,
                }),
            });

            const data = await response.json();

            if (response.status === 401) {
                await signOut({ callbackUrl: "/login?error=session-expired" });
                return;
            }

            if (!response.ok) {
                setPasswordError(data.message || "Failed to reset password");
                return;
            }

            setPasswordDialogOpen(false);
            setPasswordValue("");
        } catch {
            setPasswordError("Failed to reset password");
        } finally {
            setPasswordSubmitting(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-brand-bg-950 via-brand-bg-900 to-brand-bg-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6 relative">
                <div className="absolute top-0 -left-20 w-72 h-72 bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-0 -right-20 w-72 h-72 bg-brand-secondary/10 rounded-full blur-[120px] pointer-events-none"></div>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <Shield className="w-8 h-8 text-brand-primary" />
                            Admin Dashboard
                        </h1>
                        <p className="text-slate-400 mt-1">Manage users and system settings</p>
                    </div>
                    <UserNav />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-brand-bg-900/50 border-brand-border backdrop-blur-xl">
                        <CardHeader className="pb-3">
                            <CardDescription className="text-slate-400">Total Users</CardDescription>
                            <CardTitle className="text-3xl text-white">{users.length}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="bg-brand-bg-900/50 border-brand-border backdrop-blur-xl">
                        <CardHeader className="pb-3">
                            <CardDescription className="text-slate-400">Active Users</CardDescription>
                            <CardTitle className="text-3xl text-white">
                                {users.filter((u) => u.isActive).length}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="bg-brand-bg-900/50 border-brand-border backdrop-blur-xl">
                        <CardHeader className="pb-3">
                            <CardDescription className="text-slate-400">Admins</CardDescription>
                            <CardTitle className="text-3xl text-white">
                                {users.filter((u) => u.role === "admin").length}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                {/* User Management */}
                <Card className="bg-brand-bg-900/50 border-brand-border backdrop-blur-xl">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    User Management
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Create, update, and manage user accounts
                                </CardDescription>
                            </div>
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-linear-to-r from-brand-primary to-brand-secondary hover:from-blue-700 hover:to-purple-700">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create User
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-brand-bg-900 border-brand-border text-white">
                                    <DialogHeader>
                                        <DialogTitle>Create New User</DialogTitle>
                                        <DialogDescription className="text-slate-400">
                                            Add a new user to the system
                                        </DialogDescription>
                                    </DialogHeader>
                                    <UserForm
                                        isLoading={formSubmitting}
                                        onSubmit={handleCreateUser}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Search by name, user ID, or email"
                                    value={search}
                                    onChange={(e) => {
                                        setPage(1);
                                        setSearch(e.target.value);
                                    }}
                                    className="w-full sm:w-64 bg-brand-bg-900 border-brand-border"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <span>Rows per page</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setPage(1);
                                        setLimit(Number(e.target.value));
                                    }}
                                    className="bg-brand-bg-900 border border-brand-border rounded px-2 py-1 text-sm text-white"
                                >
                                    <option value={10}>10</option>
                                    <option value={30}>30</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="ml-4">
                                    Total: <span className="font-semibold">{totalUsers}</span>
                                </span>
                            </div>
                        </div>
                        <div className="rounded-xl glass-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-brand-bg-800/50 border-brand-border hover:bg-brand-bg-800/50">
                                        <TableHead className="text-slate-300">User ID</TableHead>
                                        <TableHead className="text-slate-300">Name</TableHead>
                                        <TableHead className="text-slate-300">Role</TableHead>
                                        <TableHead className="text-slate-300">Status</TableHead>
                                        <TableHead className="text-slate-300">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user._id} className="border-brand-border hover:bg-brand-bg-800/30">
                                            <TableCell className="text-white font-medium">{user.userId}</TableCell>
                                            <TableCell className="text-slate-300">{user.name}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 rounded-full text-xs bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
                                                    {user.role}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs ${
                                                        user.isActive
                                                            ? "bg-brand-success/20 text-brand-success border border-brand-success/30"
                                                            : "bg-brand-danger/20 text-brand-danger border border-brand-danger/30"
                                                    }`}
                                                >
                                                    {user.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-brand-border hover:bg-brand-bg-800"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setFormError("");
                                                            setEditDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-brand-border hover:bg-brand-bg-800"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setPasswordError("");
                                                            setPasswordValue("");
                                                            setPasswordDialogOpen(true);
                                                        }}
                                                    >
                                                        <Lock className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-brand-border hover:bg-brand-bg-800"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {totalPages > 1 && (
                            <div className="mt-4">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setPage((prev) => Math.max(1, prev - 1));
                                                }}
                                            />
                                        </PaginationItem>
                                        {Array.from({ length: totalPages }).map((_, index) => {
                                            const pageNumber = index + 1;
                                            return (
                                                <PaginationItem key={pageNumber}>
                                                    <PaginationLink
                                                        href="#"
                                                        isActive={page === pageNumber}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setPage(pageNumber);
                                                        }}
                                                    >
                                                        {pageNumber}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );
                                        })}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setPage((prev) => Math.min(totalPages, prev + 1));
                                                }}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="bg-brand-bg-900 border-brand-border text-white">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update user information and status
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <UserForm
                            isEditing={true}
                            initialData={selectedUser}
                            isLoading={formSubmitting}
                            onSubmit={handleUpdateUser}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent className="bg-brand-bg-900 border-brand-border text-white">
                    <DialogHeader>
                        <DialogTitle>Reset User Password</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Set a new password for "{selectedUser?.userId}". The user will be asked to change it on next login.
                        </DialogDescription>
                    </DialogHeader>
                    {passwordError && (
                        <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-400 mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{passwordError}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="adminResetPassword">New Password</Label>
                        <Input
                            id="adminResetPassword"
                            type="password"
                            value={passwordValue}
                            onChange={(e) => setPasswordValue(e.target.value)}
                            disabled={passwordSubmitting}
                            className="bg-brand-bg-800 border-brand-border"
                        />
                    </div>
                    <Button
                        className="w-full mt-4 bg-brand-primary hover:bg-blue-700"
                        disabled={passwordSubmitting || !passwordValue}
                        onClick={handleResetUserPassword}
                    >
                        {passwordSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Reset Password"
                        )}
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-brand-bg-900 border-brand-border text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            This will permanently delete the user "{selectedUser?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-brand-bg-800 border-brand-border hover:bg-brand-bg-800/80">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            className="bg-brand-danger hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
