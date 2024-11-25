"use client"
import React, { useEffect, useState } from "react";
import UsersCard from '@/components/UsersCard';
import { getUsers, updateUserVerification, deleteUser, updateUserRoles, getRoles } from '../../lib/api';
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import RoleSelectionDialog from "@/components/RoleSelectionDialog";
<<<<<<< HEAD
import { Role, User } from "@/types";
=======
import mongoose from "mongoose";
import { Role } from "@/types";
>>>>>>> dc70fc9f7b0e015cf8cd49bca9c0542f3ba056b8
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

<<<<<<< HEAD
=======
interface User {
    _id: mongoose.Schema.Types.ObjectId;
    userId: string;
    name: string;
    verified: boolean;
    roles: Role[];
    phoneNumber: string;
    generationTime?: Date;
}

>>>>>>> dc70fc9f7b0e015cf8cd49bca9c0542f3ba056b8
type Nav = 'Users' | 'Roles';

const UsersList = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const { toast } = useToast();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [nav, setNav] = useState<Nav>('Users')


    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userData, roleData] = await Promise.all([getUsers(), getRoles()]);
                setUsers(userData);
                setRoles(roleData);
                setLoading(false);
            } catch (err: any) {
                toast({ title: 'Error', description: err.message, variant: "destructive" });
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleUpdateVerification = async (userId: string, verified: boolean) => {
        try {
            const updatedUser = await updateUserVerification(userId, verified);
            setUsers((prev) =>
                prev.map((user) =>
                    user.userId === userId ? { ...user, ...updatedUser } : user
                )
            );
            toast({ title: 'Success', description: 'Updated Successfully', variant: "success" });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: "destructive" });
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUserId) return;
        try {
            await deleteUser(selectedUserId);
            setUsers((prev) => prev.filter((user) => user.userId !== selectedUserId));
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: "destructive" });
        } finally {
            setSelectedUserId(null);
        }
    };

    const handleUpdateRoles = async (userId: string, newRoles: string[]) => {
        try {
            const updatedUser = await updateUserRoles(userId, newRoles);
            setUsers((prev) =>
                prev.map((user) => (user._id === updatedUser._id ? updatedUser : user))
            );
            toast({ title: "Success", description: "Roles updated successfully", variant: "success" });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    return (
        <>
            {loading && <Loading />}
            <Toaster />
            <div className="nav mx-auto mb-4 flex gap-4 bg-muted-foreground bg-opacity-35 w-max p-4 rounded-lg">
                {(['Users', 'Roles'] as Nav[]).map((option) => (
                    <Button
                        key={option}
                        variant={nav == option ? 'default' : 'secondary'}
                        onClick={() => setNav(option)}
                    >{option}
                    </Button>))}
            </div>
<<<<<<< HEAD
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
=======
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
>>>>>>> dc70fc9f7b0e015cf8cd49bca9c0542f3ba056b8
                {nav == 'Users' && users.map((user, index) => (
                    <UsersCard
                        key={index}
                        header={`${user.name}, ID: ${user.userId}`}
                        description={`Phone: ${user.phoneNumber}`}
                        content={
                            <div>
                                <p className="flex gap-4">Verified: {user.verified ? <Check /> : <X />}</p>
                                <p>Roles: {user.roles?.map((role) => role.name).join(', ')}</p>
                                {user.generationTime && <p>Created on: {`${new Date(user.generationTime)?.toLocaleString('en-GB', {
                                    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                                }).replace(/\//g, '-')}`}</p>}
                            </div>
                        }
                        footer={
                            <div className="flex gap-2 justify-between">
                                <Button variant='outline' onClick={() => handleUpdateVerification(user.userId, !user.verified)}>
                                    {user.verified ? 'Unverify' : 'Verify'}
                                </Button>
                                <AlertDialog open={selectedUserId === user.userId} onOpenChange={(isOpen) => !isOpen && setSelectedUserId(null)}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" onClick={() => setSelectedUserId(user.userId)}>Delete</Button>
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
                        description="None"
                        content={
                            <>
                                <p>
                                    Apps: {role.permissions.apps.map((app) => app.name).join(', ')}
                                    <br />
<<<<<<< HEAD
                                    Rights: {role.permissions.apps.map((app) => app.access).join(', ')}
=======
>>>>>>> dc70fc9f7b0e015cf8cd49bca9c0542f3ba056b8
                                </p>
                            </>
                        }
                        footer={<p>will see</p>}
                    />
                ))}

            </div>
        </>

    );
};


export default UsersList;
