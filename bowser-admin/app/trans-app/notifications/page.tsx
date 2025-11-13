"use client"
import Loading from "@/app/loading"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BASE_URL } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { LoadingNotification, TransAppUser } from "@/types"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const page = () => {
    const [loading, setLoading] = useState(true)
    const [notifications, setNotifications] = useState<LoadingNotification[]>([])
    const [status, setStatus] = useState<string>("pending")
    const [user, setUser] = useState<string>("")

    useEffect(() => {
        let user = localStorage.getItem("adminUser")
        let jsonUser: TransAppUser = JSON.parse(user!)
        setUser(jsonUser.name)
    }, [])
    const fetNotificaitons = async () => {
        if (!user) return
        try {
            const response = await fetch(`${BASE_URL}/trans-app/loading-notification/by-user/${user}?status=${status}`)
            if (!response.ok) {
                const errResponse = await response.json()
                console.log("Error response:", errResponse)
                toast.error("Failed to fetch notifications", { richColors: true })
                setNotifications([])
                return
            }
            const data = await response.json()
            setNotifications(data)
            console.table(data)
        } catch (error) { } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        fetNotificaitons()
    }, [user, status])
    return (
        <div>
            {loading && <Loading />}
            {!loading && notifications.length === 0 && <p className="text-center mt-10">No notifications found</p>}
            <div className="w-full flex justify-end p-4 gap-2 sticky top-2">
                <Label>Notification Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder={status} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        {/* <SelectItem value="rejected">Rejected</SelectItem> */}
                    </SelectContent>
                </Select>
            </div>
            {notifications && notifications.length > 0 && (
                <div className="flex justify-center w-full">
                    <div className="p-4 min-h-[80svh] flex flex-col justify-center gap-4 sm:max-w-xl py-2">
                        <h3 className="text-lg font-semibold mb-4">Loading Order Notifications</h3>
                        {notifications.map((notification) => (
                            <Link href={notification.url || "#"} key={notification._id}>
                                <div className={`p-4 border ${notification.status === 'pending' ? '' : notification.status === 'completed' ? 'border-green-500' : 'border-red-500'} min-w-[377px] h-[96px] bg-card rounded-xl`}>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between font-normal text-[12px]">
                                            <div className="flex gap-2 items-center">
                                                <img src="/assets/avatar.jpg" width={24} height={24} className="rounded-full" alt="avatar" />
                                                <h4>Program Initiated</h4>
                                            </div>
                                            {notification.status === 'pending' && <span className="text-yellow-500 font-medium">(Please Complete the Process)</span>}
                                        </div>
                                        <div className="ml-[24px]">
                                            <div className="flex w-[353px] justify-between">
                                                <div className="details">
                                                    <div className="text-[14px] font-black">{notification.vehicle}</div>
                                                    <div className="text-[14px] font-medium">{notification.location}</div>
                                                </div>
                                                <div className="icon">
                                                    <img src="/icons/setplan.svg" alt="" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default page
