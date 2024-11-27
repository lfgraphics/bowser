"use client"
import Loading from '@/app/loading';
import { AlertDialog, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { deleteBowser, getBowserById, udpateBowser } from '@/lib/api';
import { Bowser } from '@/types';
import { useEffect, useState } from 'react'

const page = ({ params }: { params: { id: string } }) => {
    const [bowser, setBowser] = useState<Bowser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    // const [editing, setEditing] = useState<boolean>(false);
    const [deleted, setDeleted] = useState<boolean>(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
    const [seconds, setSeconds] = useState(5);

    useEffect(() => {
        if (deleted && seconds > 0) {
            const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [seconds, deleted]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const bowserData = await getBowserById(params.id);
                setBowser(bowserData);
                console.log(bowserData)
            } catch (err: any) {
                toast({ title: 'Error', description: err.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleUpdateBowser = async (data: Bowser) => {
        try {
            const updatedBowser = await udpateBowser(params.id, data);
            setBowser(updatedBowser);
            toast({ title: 'Success', description: 'Updated Successfully', variant: "success" });
            setDeleted(true)
            setTimeout(() => {
                window.history.back()
            }, 5000)
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: "destructive" });
        }
    };

    const handleDeletBowser = async () => {
        try {
            const response = await deleteBowser(params.id);
            toast({ title: 'Success', description: response.message, variant: "default" });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: "destructive" });
        } finally {
        }
    };
    return (
        <>
            {deleted && <p>Redirecting to previous page in: {seconds} seconds</p>}
            {loading && <Loading />}
            <Card>
                <CardHeader>
                    <CardTitle>Bowser: {bowser?.regNo}</CardTitle>
                    <CardDescription>{`${bowser?.currentTrip?.settelment.settled ? "Settled Trip" : "Un Settled Trip"}: ${bowser?.currentTrip?.tripSheetId}`}</CardDescription>
                </CardHeader>
                <CardContent>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <AlertDialog open={deleteModalOpen} onOpenChange={(isOpen) => !isOpen && setDeleteModalOpen(false)}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" onClick={() => setDeleteModalOpen(true)}>Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this Bowser: {bowser?.regNo}?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogAction onClick={() => handleDeletBowser()}>Delete</AlertDialogAction>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </>
    )
}
export default page