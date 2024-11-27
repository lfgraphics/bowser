"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, signup } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus } from "lucide-react"
import Link from "next/link"
import Loading from "@/app/loading"

interface PasswordStrength {
  strength: string;
  messages: string[];
}

export default function Signup() {
  const [userId, setUserId] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [name, setName] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)
  const [userIdError, setUserIdError] = useState<string>("")
  const [phoneNumberError, setPhoneNumberError] = useState<string>("")
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (isAuthenticated()) {
      window.location.href = "/dashboard";
    }
  }, []);

  const validateUserId = (userId: string) => {
    const regex = /^[a-z0-9._-]+$/;
    return regex.test(userId);
  }

  const validatePhoneNumber = (phoneNumber: string) => {
    const regex = /^[1-9]\d{9,12}$/;
    if (phoneNumber === '0123456789' || phoneNumber === '9876543210') {
      return false;
    }
    return regex.test(phoneNumber);
  }

  const checkPasswordStrength = (password: string) => {
    let strength = "Weak";
    let messages: string[] = [];

    if (password.length >= 8) {
      strength = "Medium";
      messages.push("Password length is good.");
    } else {
      messages.push("Password must be at least 8 characters long.");
    }

    if (/[A-Z]/.test(password)) {
      strength = "Strong";
      messages.push("Password contains uppercase letters.");
    } else {
      messages.push("Password should include at least one uppercase letter.");
    }

    if (/[0-9]/.test(password)) {
      strength = "Strong";
      messages.push("Password contains numbers.");
    } else {
      messages.push("Password should include at least one number.");
    }

    if (/[@$!%*?&#]/.test(password)) {
      strength = "Strong";
      messages.push("Password contains special characters.");
    } else {
      messages.push("Password should include at least one special character.");
    }

    setPasswordStrength({ strength, messages });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    if (!validateUserId(userId)) {
      setUserIdError("User ID must contain only lowercase letters, no numbers, special characters, or capital letters.");
      setLoading(false)
      return
    }
    if (!validatePhoneNumber(phoneNumber)) {
      setPhoneNumberError("Phone number is invalid. It cannot be sequential, less than 10 or more than 13 characters.");
      setLoading(false)
      return
    }
    try {
      await signup({ userId, password, name, phoneNumber })
      alert("Signup successful. Your account has been created. Please wait for admin verification.")
      router.push("/login")
    } catch (error) {
      console.error("Signup failed:", error)
      alert("Signup failed. An error occurred during signup. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {loading && <Loading />}
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="userId">User ID</Label>
                <Input id="userId" placeholder="Enter your user ID" value={userId} onChange={(e) => {
                  setUserId(e.target.value);
                  if (!validateUserId(e.target.value)) {
                    setUserIdError("User ID must contain only lowercase letters and numbers, no special charectors (ecxcept . _ -) or capital letters are allowed.");
                  } else {
                    setUserIdError("");
                  }
                }} required />
                {userIdError && <p className="text-red-500 mt-1">{userIdError}</p>}
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => {
                  setPassword(e.target.value);
                  checkPasswordStrength(e.target.value);
                }} required />
                {passwordStrength && (
                  <div className="mt-2">
                    <p className={`text-${passwordStrength.strength === 'Strong' ? 'green' : 'red'}-500`}>{passwordStrength.strength} Password</p>
                    <ul>
                      {passwordStrength.messages.map((message: string, index: number) => (
                        <li key={index} className={`text-${message.includes("should") ? 'red' : 'green'}-500`}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" placeholder="Enter your phone number" value={phoneNumber} onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (!validatePhoneNumber(e.target.value)) {
                    setPhoneNumberError("Phone number is invalid. It cannot be sequential, less than 10 or more than 13 characters.");
                  } else {
                    setPhoneNumberError("");
                  }
                }} required />
                {phoneNumberError && <p className="text-red-500 mt-1">{phoneNumberError}</p>}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit">
              <UserPlus className="mr-2 h-4 w-4" /> Sign Up
            </Button>
          </CardFooter>
        </form>
        <div className="my-4 text-center">
          <p>Already have an account? <Link href="/login" className="text-blue-500 hover:underline">Log in</Link></p>
        </div>
      </Card>
    </div>
  )
}
