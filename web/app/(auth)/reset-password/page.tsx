"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import axios from "axios"
import Loading from "@/app/loading"
import { BASE_URL } from "@/lib/api"
import { logout } from "@/lib/auth"

export default function ResetPassword() {
    const router = useRouter()
    const [userId, setUserId] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId') || '';
        setUserId(userId);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setSuccess("")

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            const response = await axios.patch(`${BASE_URL}/auth/reset-password`, {
                userId,
                token,
                password,
                confirmPassword
            });
            if (response.status === 200) {
                logout()
                setSuccess(response.data.message);
                setTimeout(() => router.push('/login'), 2000);
            }
        } catch (err) {
            setError((err as any).response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex justify-center items-center bg-background min-h-screen">
            {loading && <Loading />}
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Reset Password</CardTitle>
                    <CardDescription>Enter your new password</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent>
                        <div className="items-center gap-4 grid w-full">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="userId">User ID</Label>
                                <Input id="userId" value={userId} required readOnly />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="password">New Password</Label>
                                <Input id="password" type="text" placeholder="Enter your new password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input id="confirmPassword" type="password" placeholder="Confirm your new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                        </div>
                        {error && <p className="text-red-500">{error}</p>}
                        {success && <p className="text-green-500">{success}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" type="submit">
                            Update Password
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}