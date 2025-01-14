"use client";
import React, { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Loading from "@/app/loading";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/types/auth";
import { BASE_URL } from "@/lib/api";

export default function TripSheetCreatePage({ searchParams }: { searchParams: { tripSheetId?: number } }) {
    const router = useRouter();
    const params = useParams(); // from /tripsheets/create/[loadingSheetId]
    const [currentUser, setCurrentUser] = useState<User | null>()

    useEffect(() => {
        let user = getCurrentUser()
        console.log(user)
        setCurrentUser(user)
    }, [searchParams])
    const tripId = params.id;
    const [quantity, setQuantity] = useState<number>()
    const [loading, setLoading] = useState<boolean>(false)
    const [date, setDate] = useState<Date>(new Date())

    const handleSubmit = async () => {
        setLoading(true)
        let by = {
            name: currentUser?.name,
            id: currentUser?.userId
        }
        try {
            let response = await fetch(`${BASE_URL}/tripSheet/addition/${tripId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quantity,
                    by,
                    dateTime:date
                })
            })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (err) {
            console.log(err)
        } finally {
            setLoading(false)
        }
    }
    return (
        <>
            {loading && <Loading />}
            <Card className="mx-auto mt-6 max-w-screen-sm">
                <CardHeader>
                    <CardTitle>Load Addition for {searchParams.tripSheetId}</CardTitle>
                    <CardContent className="flex flex-col gap-3">
                        <Label htmlFor="qty">Date</Label>
                        <Input
                            type="datetime-local"
                            value={date.toISOString().split('T')[0] + 'T' + date.toISOString().split('T')[1].substring(0, 5)}
                            onChange={(e) => {
                                setDate(new Date(e.target.value + 'Z'))
                            }}
                        />
                        <Label htmlFor="qty">Quantity</Label>
                        <Input id="qty" type="number" value={quantity} onChange={(e) => { setQuantity(Number(e.target.value)) }}></Input>
                        <Button onClick={handleSubmit} size="lg" className="w-full">Submit</Button>
                    </CardContent>
                </CardHeader>
            </Card>
        </>
    )
}