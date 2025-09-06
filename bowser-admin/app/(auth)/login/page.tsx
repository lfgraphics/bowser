"use client"
import { useEffect, useState } from "react"
import { isAuthenticated, login, TransAppLogin } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn } from "lucide-react"
import Link from "next/link"
import Loading from "@/app/loading"
import { User } from "@/types"
import { useRouter } from 'next/navigation';
import { PasswordInput } from "@/components/PasswordInput"
import { Checkbox } from "@/components/ui/checkbox"

export const allowedRoutes: { [key: string]: [string] } = {
  Admin: ["/dashboard"],
  "Diesel Control Center Staff": ["/dashboard"],
  "Data Entry": ["/dispense-records"],
  "Loading Incharge": ["/loading/orders"],
  "BCC Authorized Officer": ["/loading/sheet"],
  "Petrol Pump Personnel": ["/loading/petrol-pump"],
  "Calibration Staff": ["/manage-bowsers"],
  "Diesel Average": ["/dispense-records"],
  "Trans App": ["/trans-app"],
};

export default function Login() {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [istransAppUser, setIsTransAppUser] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTransAppUser(localStorage.getItem('istransAppUser') === 'true');
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (istransAppUser) {
      localStorage.setItem('istransAppUser', 'true');
    } else {
      localStorage.removeItem('istransAppUser');
    }
  }, [istransAppUser, hydrated]);

  useEffect(() => {
    if (isAuthenticated()) {
      let user: User = JSON.parse(localStorage.getItem('adminUser')!);
      const redirectUrl = user?.roles.map(role => allowedRoutes[role]).find(url => url) || ["/login"];
      console.log('Redirecting to:', redirectUrl);
      router.replace(redirectUrl[0]);
    } else {
      console.log('User is not authenticated');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    setLoading(true);
    e.preventDefault();
    if (istransAppUser) {
      console.log('TransApp login:', userId, password, istransAppUser);
      try {
        const response = await TransAppLogin(userId, password);
        const localResponse = await response
        console.log("TransApp Login response:", localResponse);
        if (response.user) {
          const redirectUrl = response.user.roles.map(role => allowedRoutes[role]).find(url => url) || ["/login"];
          router.push(redirectUrl[0]);
        } else {
          alert("Account not verified. Please contact an Admin to verify your account.");
        }
      } catch (error) {
        console.error("Login failed:", error);
      } finally {
        setLoading(false);
      }
    }
    else {
      try {
        const response = await login(userId, password);
        if (response.user) {
          const redirectUrl = response.user?.roles.map(role => allowedRoutes[role]).find(url => url) || ["/login"];
          router.push(redirectUrl[0]);
        } else {
          alert("Account not verified. Please contact an Admin to verify your account.");
        }
      } catch (error) {
        console.error("Login failed:", error);
        alert("Login failed. Please check your credentials and try again.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="flex justify-center items-center bg-background min-h-screen">
      {loading && <Loading />}
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="items-center gap-4 grid w-full">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="userId">User ID</Label>
                <Input id="userId" placeholder="Enter your user ID" value={userId} onChange={(e) => setUserId(e.target.value)} required />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
          </CardContent>
          <CardFooter className="block">
            <Checkbox id="transappUser" className="mb-2" checked={istransAppUser} onCheckedChange={(checked) => setIsTransAppUser(checked === true)} /> <Label htmlFor="transappUser">Trans App Login</Label>
            <Button className="w-full" type="submit">
              <LogIn className="mr-2 w-4 h-4" /> Login
            </Button>
          </CardFooter>
        </form>
        <div className="my-4 text-center">
          <p>Don&apos;t have an account? <Link href="/signup" className="text-blue-500 hover:underline">Sign up</Link></p>
        </div>
      </Card>
    </div>
  )
}
