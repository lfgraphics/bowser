"use client"
import React, { useEffect, useState } from "react";
import UsersCard from '@/components/UsersCard';
import { getUsers, updateUserVerification, deleteUser, updateUserRoles, getRoles, getUnAuthorizedLogins, updateUserDevice, deleteUnAuthorizedRequest } from '../../lib/api';
import { Button } from "@/components/ui/button";
import { Check, CheckCircle, Search, X, XCircle } from "lucide-react";
import RoleSelectionDialog from "@/components/RoleSelectionDialog";
import { MainUser, Role, UnauthorizedLogin } from "@/types";
import Loading from "../loading";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
// import { isAuthenticated } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";

type Nav = 'Users' | 'Roles' | 'Un Authorized';

const UsersList = () => {
    const [users, setUsers] = useState<MainUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<MainUser[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isVerified, setIsVerified] = useState<boolean | null>(null);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [unAuthorizedLoginRequests, setUnAuthorizedLoginRequests] = useState<UnauthorizedLogin[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const { toast } = useToast();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [nav, setNav] = useState<Nav>('Users')

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const userDataPromise = getUsers().then(setUsers).catch(err => {
                    toast({ title: 'Error fetching users', description: err.message, variant: "destructive" });
                });

                const roleDataPromise = getRoles().then(setRoles).catch(err => {
                    toast({ title: 'Error fetching roles', description: err.message, variant: "destructive" });
                });

                const unAuthorizedLoginRequestsPromise = getUnAuthorizedLogins().then(setUnAuthorizedLoginRequests).catch(err => {
                    toast({ title: 'Error fetching unauthorized logins', description: err.message, variant: "destructive" });
                });

                // Wait for all promises to complete (even those that fail)
                await Promise.all([userDataPromise, roleDataPromise, unAuthorizedLoginRequestsPromise]);
                console.log(userDataPromise)
            } catch (err: any) {
                // This catch block is unlikely to be triggered since individual errors are caught.
                toast({ title: 'Error', description: err.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        setFilteredUsers(users);
    }, [users]);
    useEffect(() => {
        const applyFilters = () => {
            if (!searchTerm && isVerified === null && selectedRoles.length === 0) {
                setFilteredUsers(users);
                return;
            }

            const filtered = users.filter(user => {
                // Search by userId, name, or phoneNumber
                const matchesSearchTerm =
                    user.userId !== undefined && user.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.phoneNumber.includes(searchTerm);

                // Filter by verification status
                const matchesVerification = isVerified === null || user.verified === isVerified;

                // Filter by selected roles
                const matchesRoles =
                    selectedRoles.length === 0 ||
                    user.roles.some(role => selectedRoles.includes(role.name));

                return matchesSearchTerm && matchesVerification && matchesRoles;
            });

            setFilteredUsers(filtered);
        };

        applyFilters();
    }, [searchTerm, isVerified, selectedRoles, users]);

    const handleUpdateVerification = async (phoneNumber: string, verified: boolean) => {
        try {
            setLoading(true);
            const updatedUser = await updateUserVerification(phoneNumber, verified);
            setUsers((prev) =>
                prev.map((user) =>
                    user.phoneNumber === phoneNumber ? { ...user, ...updatedUser } : user
                )
            );
            toast({ title: 'Success', description: 'Updated Successfully', variant: "success" });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUserId) return;
        try {
            setLoading(true);
            await deleteUser(selectedUserId);
            setUsers((prev) => prev.filter((user) => user.userId !== selectedUserId));
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: "destructive" });
        } finally {
            setSelectedUserId(null);
            setLoading(false);
        }
    };

    const handleUpdateRoles = async (phoneNumber: string, newRoles: string[]) => {
        try {
            setLoading(true);
            const updatedUser = await updateUserRoles(phoneNumber, newRoles);
            setUsers((prev) =>
                prev.map((user) => (user.phoneNumber === updatedUser.phoneNumber ? updatedUser : user))
            );
            toast({ title: "Success", description: "Roles updated successfully", variant: "success" });
        } catch (err: any) {
            toast({ title: "Error", description: err, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAssignDeviceUUID = async (phoneNumber: string, newDeviceUUID: string) => {
        try {
            setLoading(true);
            const response = await updateUserDevice(phoneNumber, newDeviceUUID);
            toast({ title: "Success", description: response.message, variant: "success" });
        } catch (err) {
            if (err instanceof Error) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUnauthorizedRequest = async () => {
        try {
            setLoading(true);
            if (!selectedRequestId) return
            const response = await deleteUnAuthorizedRequest(selectedRequestId)
            toast({ title: "Success", description: response.message, variant: "success" });
        } catch (err) {
            if (err instanceof Error) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
            }
        } finally {
            setSelectedRequestId(null)
            setLoading(false);
        }
    }


    return (
        <>
            {loading && <Loading />}
            <>
                <Toaster />
                <div className="flex gap-4 bg-muted-foreground bg-opacity-35 mx-auto mb-4 p-4 rounded-lg w-max nav">
                    {(['Users', 'Roles', 'Un Authorized'] as Nav[]).map((option) => (
                        <Button
                            key={option}
                            variant={nav == option ? 'default' : 'secondary'}
                            onClick={() => setNav(option)}
                        >{option}
                        </Button>))}
                </div>
                {nav === 'Users' && <div className="flex flex-wrap justify-around gap-3 filter-container my-6 w-full">
                    {/* Verification Filter */}
                    <div className="flex items-center gap-4 mt-4">
                        <Switch
                            id="verified"
                            checked={isVerified === true}
                            onCheckedChange={(checked) => setIsVerified(checked ? true : null)}
                            className="hidden mr-2"
                        />
                        <Label htmlFor="verified" className="flex items-center gap-2">
                            <CheckCircle size={20} className={isVerified === true ? 'text-green-500' : 'text-gray-400'} />
                            <span>Verified</span>
                        </Label>

                        <Switch
                            id="unveried"
                            checked={isVerified === false}
                            onCheckedChange={(checked) => setIsVerified(checked ? false : null)}
                            className="hidden mr-2 ml-8"
                        />
                        <Label htmlFor="unveried" className="flex items-center gap-2">
                            <XCircle size={20} className={isVerified === false ? 'text-red-500' : 'text-gray-400'} />
                            <span>Unverified</span>
                        </Label>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="lg" className='p-4 h-10 text-center'>
                                Roles Filter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='bg-card text-center'>
                            {roles.map(role => (
                                <>
                                    <DropdownMenuItem className='p-4 w-full h-10 text-center'>
                                        <Checkbox
                                            id={role.name}
                                            key={role._id.toString()}
                                            checked={selectedRoles.includes(role.name)}
                                            onCheckedChange={(checked) => {
                                                const roleName = role.name;
                                                setSelectedRoles(prev =>
                                                    checked ? [...prev, roleName] : prev.filter(r => r !== roleName)
                                                );
                                            }}
                                        >
                                        </Checkbox>
                                        <Label htmlFor={role.name}>{role.name}</Label>
                                    </DropdownMenuItem>
                                </>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Search Input */}
                    <div className="relative w-[300px]">
                        <Search size={20} className="top-1/2 left-3 absolute text-gray-400 -translate-y-1/2 transform" />
                        <Input
                            type="text"
                            placeholder="Search name, or phone number"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                        />
                    </div>
                </div>}
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {nav === 'Users' && filteredUsers.map((user, index) => (
                        <UsersCard
                            key={index}
                            header={`${user.name}${user.userId ? ", Id:" : ""} ${user.userId ? user.userId : ""}`}
                            description={`Phone: ${user.phoneNumber}`}
                            content={
                                <div>
                                    <p className="flex gap-4">Verified: {user.verified ? <Check color="green" /> : <X color="red" />}</p>
                                    <p>Roles: {user.roles?.map((role) => role.name).join(', ')}</p>
                                    {user.generationTime && <p>Created on: {`${new Date(user.generationTime)?.toLocaleString('en-GB', {
                                        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                                    }).replace(/\//g, '-')}`}</p>}
                                </div>
                            }
                            footer={
                                <div className="flex justify-between gap-2">
                                    <Button variant='outline' onClick={() => handleUpdateVerification(user.phoneNumber, !user.verified)}>
                                        {user.verified ? 'Unverify' : 'Verify'}
                                    </Button>
                                    <AlertDialog open={selectedUserId === user.userId} onOpenChange={(isOpen) => !isOpen && setSelectedUserId(null)}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" onClick={() => setSelectedUserId(user.phoneNo!)}>Delete</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete this user: {`${user.name}, Id: ${user.userId}`}? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogAction onClick={() => handleDeleteUser()}>Delete</AlertDialogAction>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <RoleSelectionDialog
                                        user={user}
                                        roles={roles}
                                        onUpdateRoles={handleUpdateRoles}
                                    />
                                </div>
                            }
                        />
                    ))}
                    {nav === 'Roles' && roles.map((role, index) => (
                        <UsersCard
                            key={index}
                            header={`${role.name}`}
                            description={role.notes}
                            content={
                                <>
                                    <p>
                                        Apps: {role.permissions.apps.map((app) => app.name).join(', ')}
                                        <br />
                                        Rights: {role.permissions.apps.map((app) => app.access).join(', ')}
                                    </p>
                                </>
                            }
                            footer={<p>will see</p>}
                        />
                    ))}
                    {nav === "Un Authorized" && unAuthorizedLoginRequests.map((data, index) => (
                        <UsersCard
                            key={index}
                            header={`${data.name}, ID: ${data.userId}`}
                            description={`Attempted on Device UUID: ${data.attemptedDeviceUUID}`}
                            content={
                                <div>
                                    <p>Phone Number: {data.phoneNumber}</p>
                                    {data.timestamp && (
                                        <p>Attempted on: {`${new Date(data.timestamp).toLocaleString('en-GB', {
                                            day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                                        }).replace(/\//g, '-')}`}</p>
                                    )}
                                    <p>Registered Device UUID: {data.registeredDeviceUUID}</p>
                                </div>
                            }
                            footer={
                                <div className="flex justify-between gap-2">
                                    <Button
                                        variant='outline'
                                        onClick={() => handleAssignDeviceUUID(data.phoneNumber, data.attemptedDeviceUUID)}
                                    >
                                        Assign Device UUID
                                    </Button>
                                    <AlertDialog
                                        open={selectedRequestId === data._id}
                                        onOpenChange={(isOpen) => !isOpen && setSelectedRequestId(null)}
                                    >
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" onClick={() => setSelectedRequestId(data._id)}>Delete</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete this unauthorized login request for user: {`${data.name}, Id: ${data.userId}`}? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogAction onClick={() => handleDeleteUnauthorizedRequest()}>Delete</AlertDialogAction>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            }
                        />
                    ))}

                </div>
            </>
        </>

    );
};


export default UsersList;
