"use client"
import React, { useEffect, useState } from "react";
import UsersCard from '@/components/UsersCard';
import { getBowsers, udpateBowser, deleteBowser, getTripSheets } from '../../lib/api';
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import RoleSelectionDialog from "@/components/RoleSelectionDialog";
import { Bowser, TripSheet } from "@/types";
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
import Link from "next/link";

type Nav = 'Users' | 'Roles';

const UsersList = () => {
    const [bowsers, setBowsers] = useState<Bowser[]>([]);
    const [tripSheets, setTripSheets] = useState<TripSheet[]>([]);
    const [mergedData, setMergedData] = useState<(Bowser & { tripDetails?: TripSheet | null })[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const { toast } = useToast();
    const [selectBowserId, setSelectBowserId] = useState<string | null>(null);


    useEffect(() => {
        const fetchData = async () => {
            try {
                const [bowserData, tripSheetData] = await Promise.all([getBowsers(), getTripSheets()]);
                // Merge bowsers and tripSheets
                const merged = bowserData.map((bowser) => {
                    const tripDetails = tripSheetData.find(
                        (trip) =>
                            trip.bowser?.regNo === bowser.regNo // Match by bowser.regNo
                    );
                    return { ...bowser, tripDetails: tripDetails || null };
                });

                setBowsers(bowserData);
                setTripSheets(tripSheetData);
                setMergedData(merged);
                setLoading(false);
            } catch (err: any) {
                toast({ title: 'Error', description: err.message, variant: "destructive" });
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleUpdateBowser = async (id: string, data: Bowser) => {
        try {
            const updatedBowser = await udpateBowser(id, data);
            setBowsers((prev) =>
                prev.map((bowser) =>
                    bowser._id === id ? { ...bowser, ...updatedBowser } : bowser
                )
            );
            toast({ title: 'Success', description: 'Updated Successfully', variant: "success" });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: "destructive" });
        }
    };

    const handleDeletBowser = async () => {
        if (!selectBowserId) return;
        try {
            await deleteBowser(selectBowserId);
            setBowsers((prev) => prev.filter((bowser) => bowser._id !== selectBowserId));
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: "destructive" });
        } finally {
            setSelectBowserId(null);
        }
    };

    return (
        <>
            {loading && <Loading />}
            <Toaster />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {mergedData.map((item, index) => (
                    <UsersCard
                        key={index}
                        header={`${item.regNo}`}
                        description={`Current Trip: ${item.tripDetails?.tripSheetId || "No trip assigned"}, Destination: ${item.tripDetails?.fuelingAreaDestination || "Can't find the destination"}`}
                        content={
                            <div>
                                <h3>Driver Details</h3>
                                {item.tripDetails?.bowserDriver?.[0] ? (
                                    <ul>
                                        <li>Name: {item.tripDetails.bowserDriver[0].name || "N/A"}</li>
                                        <li>ID: {item.tripDetails.bowserDriver[0].id || "N/A"}</li>
                                        <li>Phone: {item.tripDetails.bowserDriver[0].phoneNo || "N/A"}</li>
                                    </ul>
                                ) : (
                                    <p>No driver details available</p>
                                )}
                            </div>
                        }
                        footer={
                            <div className="flex gap-2 justify-between">
                                <Link href={`/manage-bowsers/edit/${item._id}`}>
                                    <Button variant="default">Edit</Button>
                                </Link>
                                <AlertDialog open={selectBowserId === item._id} onOpenChange={(isOpen) => !isOpen && setSelectBowserId(null)}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" onClick={() => setSelectBowserId(item._id)}>Delete</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete this Bowser: {item.regNo}?
                                                {item.tripDetails ? (
                                                    <span>
                                                        Trip: {item.tripDetails.tripSheetId}, Status:{" "}
                                                        {item.tripDetails.settelment?.settled ? "Settled" : "Unsettled"}
                                                    </span>
                                                ) : (
                                                    "No trip details available"
                                                )}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogAction onClick={() => handleDeletBowser()}>Delete</AlertDialogAction>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        }
                    />
                ))}

            </div>
        </>

    );
};


export default UsersList;
