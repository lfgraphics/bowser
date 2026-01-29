"use client"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ListCheck, LogOut, Menu, X, CaravanIcon, User2, Fuel, ListChecks, AlignJustify, FileSpreadsheet, UserRoundCog, LucideSquareArrowOutUpRight, KeyRound, LayoutDashboard, Download, ArrowLeftRight, List, Bell, FileUp, FileDown, AudioWaveform, Home, UserCogIcon, User2Icon, TextQuote, WifiCog, Waypoints, MapPin, MapIcon, Target } from 'lucide-react'
import { logout } from '@/lib/auth'
import { useEffect, useState } from 'react'
import ThemeChanger from '../ThemeChanger'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { User } from '@/types/auth'
import OnlyAllowed from '../OnlyAllowed'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { GearIcon } from '@radix-ui/react-icons'

const CampManagementUI = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  return (
    <>
      <li onClick={toggleSidebar}>
        <Link href="/camp/admin/dashboard">
          <Button
            variant="ghost"
            className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/camp/admin/dashboard" ? "bg-primary text-primary-foreground" : ""}`}
          >
            <LayoutDashboard className="mr-2 w-4 h-4" />
            Camp Dashboard
          </Button>
        </Link>
      </li>
      <li onClick={toggleSidebar}>
        <Link href="/camp/admin/users">
          <Button
            variant="ghost"
            className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/camp/admin/users" ? "bg-primary text-primary-foreground" : ""}`}
          >
            <UserRoundCog className="mr-2 w-4 h-4" />
            Manage Camp Users
          </Button>
        </Link>
      </li>
    </>
  )
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User>()

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem('adminUser')!))

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '[') {
        toggleSidebar()
      }
    }

    const handleBackEvent = () => {
      if (isOpen) {
        setIsOpen(false)
        history.pushState(null, '', window.location.href);
      }
    }

    const isMobile = window.innerWidth <= 768;

    window.addEventListener("keydown", handleKeyDown);
    if (isMobile) {
      window.addEventListener("popstate", handleBackEvent);

      if (isOpen) {
        history.pushState(null, "", window.location.href);
      }
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (isMobile) {
        window.removeEventListener("popstate", handleBackEvent);
      }
    };
  }, [isOpen])

  const handleLogout = () => {
    logout()
  }

  const toggleSidebar = () => {
    setIsOpen(prev => {
      if (!prev) {
        history.pushState(null, '', window.location.href);
      }
      return !prev;
    });
  }

  const isAdmin = user?.Division === "EthanolAdmin";
  const isTransAppUser = user?.roles.includes("Trans App");

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger id="menuIcon" className="top-4 left-4 z-30 sticky">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </SheetTrigger>
        <SheetContent
          side="left"
          className="top-0 left-0 z-50 fixed bg-background shadow w-max"
        >
          <SheetHeader>
            <SheetTitle>Hii {user?.name}</SheetTitle>
          </SheetHeader>
          <SheetDescription>
            Your role{user?.roles?.length! > 1 ? "s are: " : " is: "}
            {user?.roles.join(", ")}
          </SheetDescription>
          <div className="flex flex-col p-3 h-full">
            <nav className="h-[80%] overflow-y-auto relative">
              <ul className="space-y-1 text-sm">
                <OnlyAllowed
                  allowedRoles={["Admin", "Diesel Control Center Staff"]}
                >
                  <li onClick={toggleSidebar}>
                    <Link href="/dashboard">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/dashboard" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <LucideSquareArrowOutUpRight className="mr-2 w-4 h-4" />
                        Allocate
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                {/* Trans App navs start */}
                <OnlyAllowed allowedRoles={["Trans App"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/trans-app">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/trans-app" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <Home className="mr-2 w-4 h-4" />
                        Home
                      </Button>
                    </Link>
                  </li>
                  <li onClick={toggleSidebar}>
                    <Link href="/trans-app/notifications">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/trans-app/notifications" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <Bell className="mr-2 w-4 h-4" />
                        Notifications
                      </Button>
                    </Link>
                  </li>
                  <li onClick={toggleSidebar}>
                    <Link href="/trans-app/unloading-tracker">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/trans-app/unloading-tracker" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <FileDown className="mr-2 w-4 h-4" />
                        Unloading Tracker
                      </Button>
                    </Link>
                  </li>
                  <li onClick={toggleSidebar}>
                    <Link href="/trans-app/loading-planner">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/trans-app/loading-planner" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <FileUp className="mr-2 w-4 h-4" />
                        Loading Planner
                      </Button>
                    </Link>
                  </li>
                  <li onClick={toggleSidebar}>
                    <Link href="/trans-app/loading-tracker">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/trans-app/loading-tracker" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <AudioWaveform className="mr-2 w-4 h-4" />
                        Loading Tracker
                      </Button>
                    </Link>
                  </li>
                  <li onClick={toggleSidebar}>
                    <Link href="/trans-app/trips-ranking">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/trans-app/trips-ranking" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <TextQuote className="mr-2 w-4 h-4" />
                        Trips Ranking
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                {/* Trans App navs end */}
                <OnlyAllowed allowedRoles={["Diesel Control Center Staff", "Admin"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/manage-vehicles">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/manage-vehicles" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <CaravanIcon className="mr-2 w-4 h-4" />
                        Manage Vehicles
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                {!user?.Division?.includes('Admin') && <OnlyAllowed allowedRoles={["Diesel Control Center Staff", "Admin", "Trans App"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/manage-drivers">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/manage-drivers" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <UserCogIcon className="mr-2 w-4 h-4" />
                        Manage Drivers
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>}
                {user?.Division?.includes('Admin') && <li onClick={toggleSidebar}>
                  <Link href="/trans-app/manage-supervisors">
                    <Button
                      variant="ghost"
                      className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/trans-app/manage-supervisors" ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      <UserCogIcon className="mr-2 w-4 h-4" />
                      Manage Supervisors
                    </Button>
                  </Link>
                </li>}
                <OnlyAllowed allowedRoles={["Diesel Control Center Staff", "Admin", "BCC Authorized Officer"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/push-notifications">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/push-notifications" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <Bell className="mr-2 w-4 h-4" />
                        Notification
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin", "Diesel Control Center Staff"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/fuel-request">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/fuel-request" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <Fuel className="mr-2 w-4 h-4" />
                        Fuel Requests
                      </Button>
                    </Link>
                  </li>
                  <li onClick={toggleSidebar}>
                    <Link href="/manage-requests">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/manage-requests" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <ArrowLeftRight className="mr-2 w-4 h-4" />
                        Manage Requests
                      </Button>
                    </Link>
                  </li>
                  <li onClick={toggleSidebar}>
                    <Link href={`/my-allocation?allocator=${user?.userId}`}>
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/my-allocation" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <List className="mr-2 w-4 h-4" />
                        My Allocations
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin"]}>
                  <li onClick={toggleSidebar}>
                    <Link href='/fuel-allocations'>
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/fuel-allocations" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <LayoutDashboard className="mr-2 w-4 h-4" />
                        Fuel Allocations
                      </Button>
                    </Link>
                  </li>
                  <li onClick={toggleSidebar}>
                    <Link href='/fuel-requests'>
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/fuel-requests" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <LayoutDashboard className="mr-2 w-4 h-4" />
                        Fuel Reqursts
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed
                  allowedRoles={[
                    "Admin",
                    "Diesel Control Center Staff",
                    "Data Entry",
                    "BCC Authorized Officer",
                    "Diesel Average",
                  ]}
                >
                  <li onClick={toggleSidebar}>
                    <Link href="/dispense-records">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/dispense-records" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <ListChecks className="mr-2 w-4 h-4" />
                        Dispense Records
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin", "Data Entry"]}>
                  <Accordion type="single" collapsible className='w-full p-3'>
                    <AccordionItem value="item-1">
                      <AccordionTrigger> <GearIcon className="mr-2 w-4 h-4" /> Manage TransApp</AccordionTrigger>
                      <AccordionContent>
                        <li onClick={toggleSidebar}>
                          <Link href="/customers-crud">
                            <Button
                              variant="ghost"
                              className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/customers-crud" ? "bg-primary text-primary-foreground" : ""}`}
                            >
                              <WifiCog className="mr-2 w-4 h-4" />
                              Manage Customers
                            </Button>
                          </Link>
                        </li>
                        <li onClick={toggleSidebar}>
                          <Link href="/routes-crud">
                            <Button
                              variant="ghost"
                              className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/routes-crud" ? "bg-primary text-primary-foreground" : ""}`}
                            >
                              <Waypoints className="mr-2 w-4 h-4" />
                              Manage Routes
                            </Button>
                          </Link>
                        </li>
                        <li onClick={toggleSidebar}>
                          <Link href="/cities-crud">
                            <Button
                              variant="ghost"
                              className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/routes-crud" ? "bg-primary text-primary-foreground" : ""}`}
                            >
                              <MapIcon className="mr-2 w-4 h-4" />
                              Manage Cities
                            </Button>
                          </Link>
                        </li>
                        <li onClick={toggleSidebar}>
                          <Link href="/locations-crud">
                            <Button
                              variant="ghost"
                              className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/locations-crud" ? "bg-primary text-primary-foreground" : ""}`}
                            >
                              <Target className="mr-2 w-4 h-4" />
                              Manage Locations
                            </Button>
                          </Link>
                        </li>
                        <li onClick={toggleSidebar}>
                          <Link href="/destinations-crud">
                            <Button
                              variant="ghost"
                              className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/destinations-crud" ? "bg-primary text-primary-foreground" : ""}`}
                            >
                              <MapPin className="mr-2 w-4 h-4" />
                              Manage Destinations
                            </Button>
                          </Link>
                        </li>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </OnlyAllowed>
                <OnlyAllowed
                  allowedRoles={[
                    "Admin",
                    "Loading Incharge",
                    "BCC Authorized Officer",
                  ]}
                >
                  <li onClick={toggleSidebar}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href="/loading/orders">
                            <Button
                              variant="ghost"
                              className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/loading/orders" ? "bg-primary text-primary-foreground" : ""}`}
                            >
                              <AlignJustify className="mr-2 w-4 h-4" />
                              Loading Orders
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent className="bg-background max-w-44 text-foreground text-md">
                          <p>
                            Orders for loading a Bowser, to make it ready for a
                            trip
                            <br />
                            (For Loading Incharges and for BCC to create and
                            manage the orders)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed
                  allowedRoles={[
                    "Admin",
                    "Petrol Pump Personnel",
                    "BCC Authorized Officer",
                  ]}
                >
                  <li onClick={toggleSidebar}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href="/loading/petrol-pump">
                            <Button
                              variant="ghost"
                              className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/loading/petrol-pump" ? "bg-primary text-primary-foreground" : ""}`}
                            >
                              <Fuel className="mr-2 w-4 h-4" />
                              Orders
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent className="bg-background max-w-44 text-foreground text-md">
                          <p>
                            Orders for loading a Bowser, to make it ready for a
                            trip
                            <br />
                            (For Petrol Pumps)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer"]}>
                  <li onClick={toggleSidebar}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href="/loading/sheet">
                            <Button
                              variant="ghost"
                              className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/loading/sheet" ? "bg-primary text-primary-foreground" : ""}`}
                            >
                              <FileSpreadsheet className="mr-2 w-4 h-4" />
                              Loading Sheets
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent className="bg-background max-w-44 text-foreground text-md">
                          <p>
                            After the order is fulfilled, the details will show
                            here to assign bowser driver and destination
                            <br />
                            (For Bowser Control Center Only)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed
                  allowedRoles={[
                    "Admin",
                    "BCC Authorized Officer",
                    "Diesel Control Center Staff",
                    "Data Entry",
                  ]}
                >
                  <li onClick={toggleSidebar}>
                    <Link href="/tripsheets">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/tripsheets" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <ListCheck className="mr-2 w-4 h-4" />
                        Trip Sheets
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed
                  allowedRoles={[
                    "Admin",
                    "BCC Authorized Officer",
                    "Calibration Staff",
                  ]}
                >
                  <li onClick={toggleSidebar}>
                    <Link href="/manage-bowsers">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/manage-bowsers" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <CaravanIcon className="mr-2 w-4 h-4" />
                        Manage Bowsers
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/manage-users">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/manage-users" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <UserRoundCog className="mr-2 w-4 h-4" />
                        Manage Users
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                {/* Camp Management - Available for Trans App Admins and Camp Admins */}
                {isTransAppUser ? isAdmin &&
                  <CampManagementUI toggleSidebar={toggleSidebar} />
                  :
                  null
                }
                <OnlyAllowed allowedRoles={["Admin", "admin"]}>
                  <CampManagementUI toggleSidebar={toggleSidebar} />
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["officer"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/camp/dashboard">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/camp/dashboard" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <LayoutDashboard className="mr-2 w-4 h-4" />
                        Dashboard
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer", "Diesel Control Center Staff", "Data Entry", "Loading Incharge", "Petrol Pump Personnel", "Calibration Staff", "Diesel Average"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/profile">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/profile" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <User2 className="mr-2 w-4 h-4" />
                        Profile
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                {/* Camp User Profile */}
                <OnlyAllowed allowedRoles={["admin", "officer", "supervisor"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/camp/profile">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/camp/profile" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <User2 className="mr-2 w-4 h-4" />
                        My Profile
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                {/* Dynamica access Routes ends here ................ */}
                <li onClick={toggleSidebar}>
                  <Link href="/download">
                    <Button
                      variant="ghost"
                      className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/download" ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      <Download size={18} className="mr-2 w-4 h-4" />
                      Download
                    </Button>
                  </Link>
                </li>
                <OnlyAllowed allowedRoles={["Trans App"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/trans-app/manage-profile">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/trans-app/manage-profile" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <User2Icon className="mr-2 w-4 h-4" />
                        Profile
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <OnlyAllowed allowedRoles={["Admin"]}>
                  <li onClick={toggleSidebar}>
                    <Link href="/password-reset-link">
                      <Button
                        variant="ghost"
                        className={`justify-start w-full ${typeof window !== "undefined" && window.location.pathname === "/password-reset-link" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <KeyRound className="mr-2 w-4 h-4" />
                        Change Password
                      </Button>
                    </Link>
                  </li>
                </OnlyAllowed>
                <li>
                  <ThemeChanger />
                </li>
              </ul>
              <div className="sticky bottom-0 h-8 w-full bg-linear-to-t from-background to-transparent z-10"></div>
            </nav>
            <div className="mt-auto h-[15%]">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
