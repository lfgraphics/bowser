"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, signup, campSignup } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus } from "lucide-react"
import Link from "next/link"
import Loading from "@/app/loading"
import { PasswordInput } from "@/components/PasswordInput"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface PasswordStrength {
  strength: string;
  messages: string[];
}

export default function Signup() {
  const [userId, setUserId] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [name, setName] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [userType, setUserType] = useState<'diesel' | 'transapp' | 'camp'>('diesel')
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)
  const [userIdError, setUserIdError] = useState<string>("")
  const [phoneNumberError, setPhoneNumberError] = useState<string>("")
  const [emailError, setEmailError] = useState<string>("")
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (isAuthenticated()) {
      window.location.href = "/dashboard";
    }
  }, []);

  // Clear userId when switching to camp type since camp users don't need it
  useEffect(() => {
    if (userType === 'camp') {
      setUserId('');
      setUserIdError('');
    }
  }, [userType]);

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

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
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
    
    // Validate User ID only for diesel and transapp users
    if (userType === 'diesel' || userType === 'transapp') {
      if (!userId.trim()) {
        setUserIdError("User ID is required.");
        setLoading(false)
        return
      }
      if (!validateUserId(userId)) {
        setUserIdError("User ID must contain only lowercase letters, no numbers, special characters, or capital letters.");
        setLoading(false)
        return
      }
    }
    
    // Validate phone number for all users
    if (!validatePhoneNumber(phoneNumber)) {
      setPhoneNumberError("Phone number is invalid. It cannot be sequential, less than 10 or more than 13 characters.");
      setLoading(false)
      return
    }

    if (userType === 'camp' && email && !validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      setLoading(false)
      return
    }

    try {
      if (userType === 'camp') {
        await campSignup({ 
          userId: phoneNumber, // For camp users, use phone as userId 
          password, 
          name, 
          phone: phoneNumber,
          email: email || undefined
        })
        alert("Camp signup successful. Your account has been created. Please wait for admin verification.")
      } else {
        // Both diesel and transapp users use the same signup endpoint
        await signup({ userId, password, name, phoneNumber })
        const signupTypeMessage = userType === 'transapp' ? "Trans App" : "Diesel";
        alert(`${signupTypeMessage} signup successful. Your account has been created. Please wait for admin verification.`)
      }
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
          <CardDescription>
            {userType === 'camp' 
              ? 'Create a new camp account - you will log in using your phone number'
              : userType === 'transapp'
              ? 'Create a new Trans App account'
              : 'Create a new diesel account'
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label className="text-sm font-medium">Account Type</Label>
                <RadioGroup value={userType} onValueChange={(value) => setUserType(value as 'diesel' | 'transapp' | 'camp')} className="flex flex-row space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="diesel" id="diesel-signup" />
                    <Label htmlFor="diesel-signup">Diesel</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="transapp" id="transapp-signup" />
                    <Label htmlFor="transapp-signup">Trans App</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="camp" id="camp-signup" />
                    <Label htmlFor="camp-signup">Camp</Label>
                  </div>
                </RadioGroup>
              </div>
              {/* User ID - Only for Diesel and Trans App users */}
              {(userType === 'diesel' || userType === 'transapp') && (
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
              )}
              
              {/* Name - Always visible */}
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              {/* Phone Number - Always visible */}
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" type="tel" placeholder="Enter your phone number" value={phoneNumber} onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (!validatePhoneNumber(e.target.value)) {
                    setPhoneNumberError("Phone number is invalid. It cannot be sequential, less than 10 or more than 13 characters.");
                  } else {
                    setPhoneNumberError("");
                  }
                }} required />
                {phoneNumberError && <p className="text-red-500 mt-1">{phoneNumberError}</p>}
              </div>

              {/* Email - Only for Camp users */}
              {userType === 'camp' && (
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input id="email" type="email" placeholder="Enter your email address" value={email} onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value && !validateEmail(e.target.value)) {
                      setEmailError("Please enter a valid email address.");
                    } else {
                      setEmailError("");
                    }
                  }} />
                  {emailError && <p className="text-red-500 mt-1">{emailError}</p>}
                </div>
              )}

              {/* Password - Always visible */}
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" placeholder="Enter your password" value={password} onChange={(e) => {
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
              {userType === 'camp' && (
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input id="email" type="email" placeholder="Enter your email address" value={email} onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value && !validateEmail(e.target.value)) {
                      setEmailError("Please enter a valid email address.");
                    } else {
                      setEmailError("");
                    }
                  }} />
                  {emailError && <p className="text-red-500 mt-1">{emailError}</p>}
                </div>
              )}
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
