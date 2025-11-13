import Loading from "@/app/loading";
import { TankersTrip, TransAppUser } from "@/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Combobox, { ComboboxOption } from "./Combobox";
import { BASE_URL } from "@/lib/api";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { AlertDescription } from "./ui/alert";

const AdminLoadingPlanner = ({ trip, manager, trigger }: { trip: TankersTrip, manager: string, trigger: string }) => {
    const [loading, setLoading] = useState(true);
    const [stackHolder, setStackHolder] = useState<string>("")
    const [stackHolders, setStackHolders] = useState<ComboboxOption[]>([])
    const [search, setSearch] = useState<string>("")
    const [isOpen, setIsOpen] = useState(false);
    const [admin, setAdmin] = useState<string>("")

    useEffect(() => {
        let user = localStorage.getItem("adminUser")
        let jsonUser: TransAppUser = JSON.parse(user!)
        setAdmin(jsonUser.name)
    }, [])

    const fetchStackHolders = async () => {
        try {
            const response = await fetch(`${BASE_URL}/trans-app/stack-holders?params=${search}`);
            const data = await response.json();
            const formattedData: ComboboxOption[] = data.map((item: { _id: string, InstitutionName: string, Location: string }) => ({
                value: item._id,
                label: `${item.InstitutionName}: ${item.Location}`
            }));
            setStackHolders(formattedData);
        } catch (error: any) {
            const message = error?.message || 'Failed to fetch destinations';
            toast.error(message, { richColors: true });
        }
    }

    const handleSubmit = async () => {
        if (!stackHolder) {
            toast.error("Please select a stack holder", { richColors: true });
            return;
        }
        const dataJson = {
            tripId: trip._id,
            to: manager,
            destinationId: stackHolder,
            destinationName: stackHolders.find(holder => holder.value === stackHolder)?.label.split(':')[0].trim() || stackHolder,
            location: stackHolders.find(holder => holder.value === stackHolder)?.label.split(':')[1].trim() || stackHolder,
            from: admin,
            vehicle: trip.VehicleNo || ""
        }

        try {
            const response = await fetch(`${BASE_URL}/trans-app/loading-notification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataJson),
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Loading notification sent successfully", { richColors: true });
                console.table(data);
                setIsOpen(false);
            } else {
                toast.error("Failed to send loading notification", { richColors: true });
            }
        } catch (error: any) {
            const message = error?.message || 'Failed to send loading notification';
            toast.error(message, { richColors: true });
        }

        console.table(dataJson);
    }

    useEffect(() => {
        fetchStackHolders().finally(() => setLoading(false));
    }, [search]);

    return (
        <>
            {loading &&
                <Loading />
            }
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="outline">{trigger || "Order"}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent id="adminorder">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Order Loading destination</AlertDialogTitle>
                        <AlertDescription></AlertDescription>
                    </AlertDialogHeader>
                    <Combobox
                        className={`${!stackHolder ? "bg-yellow-100" : ""} w-full`}
                        options={stackHolders}
                        value={stackHolder}
                        onChange={setStackHolder}
                        searchTerm={search}
                        onSearchTermChange={setSearch}
                        placeholder="Select Destination"
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button onClick={handleSubmit}>Submit</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default AdminLoadingPlanner
