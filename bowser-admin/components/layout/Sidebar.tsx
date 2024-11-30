"use client"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Home, ClipboardList, ListCheck, User, LogOut, Menu, X, SheetIcon, Users2, Users, CaravanIcon } from 'lucide-react'
import { logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ThemeChanger from '../ThemeChanger'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

export function Sidebar() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    logout()
    localStorage.setItem('isLoggedIn', 'false')
    router.push('/login')
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger
          className="fixed top-4 left-4 z-30"
          onClick={toggleSidebar}>
          {/* <Button
            variant="secondary"

          > */}
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          {/* </Button> */}
        </SheetTrigger>
        <SheetContent side="left" className="fixed top-0 left-0 z-40 h-full w-60 shadow bg-background">
          <SheetHeader>
            <SheetTitle>Bowser Admin</SheetTitle>
          </SheetHeader>
          <SheetDescription></SheetDescription>
          <div className="flex flex-col h-full p-3" onClick={toggleSidebar}>
            <nav className="flex-1">
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/dashboard">
                    <Button variant="ghost" className="w-full justify-start">
                      <Home className="mr-2 h-4 w-4" />
                      Home
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/my-allocations">
                    <Button variant="ghost" className="w-full justify-start">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      My Allocations
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/dispense-records">
                    <Button variant="ghost" className="w-full justify-start">
                      <SheetIcon className="mr-2 h-4 w-4" />
                      Dispense Records
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/tripsheets">
                    <Button variant="ghost" className="w-full justify-start">
                      <ListCheck className="mr-2 h-4 w-4" />
                      Trip Sheets
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/profile">
                    <Button variant="ghost" className="w-full justify-start">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/manage-bowsers">
                    <Button variant="ghost" className="w-full justify-start">
                      <CaravanIcon className="mr-2 h-4 w-4" />
                      Manage Bowsers
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/manage-users">
                    <Button variant="ghost" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Button>
                  </Link>
                </li>
                <li>
                  <ThemeChanger />
                </li>
              </ul>
            </nav>
            <div className="mt-auto">
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
