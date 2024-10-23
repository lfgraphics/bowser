"use client"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Home, ClipboardList, ListCheck, User, LogOut, Menu, X } from 'lucide-react'
import { logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import ThemeChanger from '../ThemeChanger'

export function Sidebar() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)

  const handleLogout = () => {
    logout()
    localStorage.setItem('isLoggedIn', 'false')
    router.push('/login')
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(true)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      <Button
        variant="ghost"
        className="fixed top-4 left-4 md:hidden"
        onClick={toggleSidebar}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>
      <div
        className={`fixed top-0 left-0 z-10 h-full w-60 shadow transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
      >
        <div className="flex flex-col h-full p-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Dashboard</h2>
            <Button variant="ghost" className="md:hidden" onClick={toggleSidebar}>
              <X className="h-6 w-6" />
            </Button>
          </div>
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
                <Link href="/dashboard/my-orders">
                  <Button variant="ghost" className="w-full justify-start">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    My Orders
                  </Button>
                </Link>
              </li>
              <li>
                <Link href="/dashboard/vehicle-dispenses">
                  <Button variant="ghost" className="w-full justify-start">
                    <ListCheck className="mr-2 h-4 w-4" />
                    Verify Dispenses
                  </Button>
                </Link>
              </li>
              <li>
                <Link href="/dashboard/profile">
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                </Link>
              </li>
              <li>
                <Button variant="ghost" className="w-full justify-start">
                  <ThemeChanger />
                </Button>
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
      </div>
    </>
  )
}
