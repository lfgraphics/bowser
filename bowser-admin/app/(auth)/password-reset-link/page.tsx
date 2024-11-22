"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import axios from "axios"
import { Copy } from "lucide-react"
import Loading from "@/app/loading"

export default function GenerateResetUrl() {
    const [userId, setUserId] = useState("")
    const [resetUrl, setResetUrl] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        setLoading(true)
        e.preventDefault()
        setError("")
        setResetUrl("")

        try {
            const response = await axios.post('https://bowser-backend-2cdr.onrender.com/auth/generate-reset-url', { userId }) //https://bowser-backend-2cdr.onrender.com
            setResetUrl(response.data.resetUrl)
        } catch (err) {
            setError((err as any).response?.data?.message || 'An error occurred while generating the reset URL.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            {loading && <Loading />}
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Generate Reset URL</CardTitle>
                    <CardDescription>Enter the User ID to generate a reset password URL</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="userId">User ID</Label>
                                <Input id="userId" placeholder="Enter User ID" value={userId} onChange={(e) => setUserId(e.target.value)} required />
                            </div>
                            {error && <p className="text-red-500">{error}</p>}
                            {resetUrl && (
                                <div className="mt-4">
                                    <p className="text-green-500">Reset URL generated:</p>
                                    <div className="flex items-center">
                                        <a href={resetUrl} className="text-blue-500 hover:underline">{resetUrl.slice(0, 20)}...</a>
                                        <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(resetUrl); alert('Password Reset url Copied to clip board') }} className="ml-2 p-3 rounded text-foreground">
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" type="submit">
                            Generate Reset URL
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}