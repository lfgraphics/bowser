"use client"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Home, ClipboardList, ListCheck, LogOut, Menu, X, SheetIcon, Users, CaravanIcon, User2, ListOrdered, TableOfContents } from 'lucide-react'
import { logout } from '@/lib/auth'
import { useEffect, useState } from 'react'
import ThemeChanger from '../ThemeChanger'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
// import { DropdownfuelingTransactionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu"
import { User } from '@/types/auth'
import OnlyAllowed from '../OnlyAllowed'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    let localUser = localStorage.getItem("adminUser");
    if (localUser) {
      let localUserData: User = JSON.parse(localUser)
      // let lastDigit = localUserData?.phoneNumber.slice(-1);
      setId(localUserData.userId)
    }
  }, [])

  const handleLogout = () => {
    logout()
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger
          className="top-4 left-4 z-30 fixed">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </SheetTrigger>
        <SheetContent side="left" className="top-0 left-0 z-50 fixed bg-background shadow w-60 h-full">
          <SheetHeader>
            <SheetTitle>{JSON.parse(localStorage?.getItem('adminUser')!).roles[0]}</SheetTitle>
          </SheetHeader>
          <SheetDescription>{JSON.parse(localStorage?.getItem('adminUser')!).roles.join(', ')}</SheetDescription>
          <div className="flex flex-col p-3 h-full">
            <nav className="h-[90%]">
              <ul className="space-y-1 text-sm">
                <OnlyAllowed allowedRoles={["Admin", "Diesel Control Center Staff"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/dashboard">
                      <Button variant="ghost" className="justify-start w-full">
                        <Home className="mr-2 w-4 h-4" />
                        Home
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                {/* Dynamica access Routes in upcoming updates starts here ................ */}
                <OnlyAllowed allowedRoles={["Admin", "Diesel Control Center Staff"]}>
                  <li onClick={toggleSidebar}>
                    <Link href={`/dispense-records?allocator=${id}`}>
                      <Button variant="ghost" className="justify-start w-full">
                        <ClipboardList className="mr-2 w-4 h-4" />
                        My Allocations
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin", "Diesel Control Center Staff", "Data Entry", "BCC Authorized Officer"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/dispense-records">
                      <Button variant="ghost" className="justify-start w-full">
                        <SheetIcon className="mr-2 w-4 h-4" />
                        Dispense Records
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin", "Loading Incharge", "Petrol Pump Personnel", "BCC Authorized Officer"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/loading/orders">
                      <Button variant="ghost" className="justify-start w-full">
                        <ListOrdered className="mr-2 w-4 h-4" />
                        Loading Orders
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/loading/sheet">
                      <Button variant="ghost" className="justify-start w-full">
                        <TableOfContents className="mr-2 w-4 h-4" />
                        Loading Sheets
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer", "Diesel Control Center Staff", "Data Entry"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/tripsheets">
                      <Button variant="ghost" className="justify-start w-full">
                        <ListCheck className="mr-2 w-4 h-4" />
                        Trip Sheets
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/manage-bowsers">
                      <Button variant="ghost" className="justify-start w-full">
                        <CaravanIcon className="mr-2 w-4 h-4" />
                        Manage Bowsers
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/manage-users">
                      <Button variant="ghost" className="justify-start w-full">
                        <Users className="mr-2 w-4 h-4" />
                        Manage Users
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                {/* Dynamica access Routes in upcoming updates ends here ................ */}
                <li onClick={toggleSidebar}>
                  <Link href="/profile">
                    <Button variant="ghost" className="justify-start w-full">
                      <User2 className="mr-2 w-4 h-4" />
                      Profile
                    </Button>
                  </Link>
                </li>
                <li>
                  <ThemeChanger />
                </li>
              </ul>
            </nav>
            <div className="mt-auto h-[10%]">
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2 w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
