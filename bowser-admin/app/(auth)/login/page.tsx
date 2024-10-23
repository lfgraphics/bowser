"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { login } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn } from "lucide-react"
// import { toast } from "@/components/ui/use-toast"
// import { useToast } from "@/components/ui/use-toast"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function Login() {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await login(userId, password)
      if (response.user.verified) {
        router.push("/dashboard")
      } else {
        toast({
          title: "Account not verified",
          description: "Please contact an administrator to verify your account.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Login failed:", error)
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="userId">User ID</Label>
                <Input id="userId" placeholder="Enter your user ID" value={userId} onChange={(e) => setUserId(e.target.value)} required />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit">
              <LogIn className="mr-2 h-4 w-4" /> Login
            </Button>
          </CardFooter>
        </form>
        <div className="my-4 text-center">
          <p>Don't have an account? <Link href="/signup" className="text-blue-500 hover:underline">Sign up</Link></p>
        </div>
      </Card>
    </div>
  )
}
