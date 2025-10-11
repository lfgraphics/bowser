"use client"
import { useEffect, useState } from "react"
import { isAuthenticated, login, TransAppLogin, campLogin } from "@/lib/auth"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"

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
  // Camp user roles
  "admin": ["/camp/admin/dashboard"],
  "officer": ["/camp/dashboard"],
  "supervisor": ["/camp/dashboard"],
};

export default function Login() {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState<'diesel' | 'transapp' | 'camp'>('diesel');
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserType = localStorage.getItem('userType') as 'diesel' | 'transapp' | 'camp';
      if (storedUserType && ['diesel', 'transapp', 'camp'].includes(storedUserType)) {
        setUserType(storedUserType);
      }
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('userType', userType);
  }, [userType, hydrated]);

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

    if (userType === 'camp') {
      // Camp login
      try {
        const response = await campLogin(userId, password);
        if (response.user) {
          const redirectUrl = response.user.roles.map(role => allowedRoutes[role]).find(url => url) || ["/dashboard"];
          router.push(redirectUrl[0]);
        } else {
          toast.error("Account not verified. Please contact an Admin to verify your account.");
        }
      } catch (error) {
        console.error("Camp login failed:", error);
        toast.error("Camp login failed. Please check your credentials and try again.");
      } finally {
        setLoading(false);
      }
    } else if (userType === 'transapp') {
      // TransApp login
      console.log('TransApp login:', userId, password, userType);
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
      // Regular diesel login
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
          <CardDescription>
            {userType === 'camp'
              ? 'Enter your phone number and password to access your camp account'
              : 'Enter your credentials to access your account'
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="items-center gap-4 grid w-full">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="userId">
                  {userType === 'camp' ? 'Phone Number' : 'User ID'}
                </Label>
                <Input
                  id="userId"
                  type={userType === 'camp' ? 'tel' : 'text'}
                  placeholder={userType === 'camp' ? 'Enter your phone number' : 'Enter your user ID'}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
          </CardContent>
          <CardFooter className="block">
            <div className="space-y-3 mb-4">
              <Label className="text-sm font-medium">Login Type</Label>
              <RadioGroup value={userType} onValueChange={(value) => setUserType(value as 'diesel' | 'transapp' | 'camp')} className="flex flex-row space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="diesel" id="diesel" />
                  <Label htmlFor="diesel">Diesel</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="transapp" id="transapp" />
                  <Label htmlFor="transapp">Trans App</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="camp" id="camp" />
                  <Label htmlFor="camp">Camp</Label>
                </div>
              </RadioGroup>
            </div>
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
