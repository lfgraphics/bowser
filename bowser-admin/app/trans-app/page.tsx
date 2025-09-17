"use client"
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Trash2, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { BASE_URL } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TransAppContext } from "./layout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import Loading from '../loading'
import { searchItems } from '@/utils/searchUtils'
import { InactiveVehicles, Vehicle, VehicleWithTrip } from '@/types'
import { TabsTrigger, Tabs, TabsList } from '@/components/ui/tabs'
import { formatDate } from '@/lib/utils'
import { SearchModal } from '@/components/SearchModal'
import VehiclesSummary from '@/components/transappComponents/VehiclesSummary'
import VehicleManagement from '@/components/transappComponents/VehicleManagement'

type Tabslist = "Vehicles" | "Inactive Vehicles" | "Summary"

export default function Page() {
  const { user, photo } = useContext(TransAppContext);
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tabslist>("Summary")
  const [tabReady, setTabReady] = useState(false)
  const [vehicles, setVehicles] = useState<string[]>()
  const [vehicleNumber, setVehicleNumber] = useState<string>()
  const [isVehicleAdditionDialogvisible, setIsVehicleAdditionDialogvisible] = useState(false)
  const [inactiveVehicles, setInactiveVehilesList] = useState<InactiveVehicles[]>()
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [searchModalConfig, setSearchModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    items: any[];
    onSelect: (item: any) => void;
    renderItem: (item: any) => React.ReactNode;
    keyExtractor: (item: any) => string;
  }>({
    isOpen: false,
    title: "",
    items: [],
    onSelect: () => { },
    renderItem: () => null,
    keyExtractor: () => "",
  });

  // Determine allowed tabs based on user (Inactive Vehicles hidden for Admins)
  const allowedTabs = useMemo<Readonly<Tabslist[]>>(() => {
    const isAdmin = !!user?.Division?.includes('Admin')
    return isAdmin ? ["Summary", "Vehicles"] : ["Summary", "Vehicles", "Inactive Vehicles"]
  }, [user])

  // Utility to map between tabs and URL slugs
  const tabToSlug = useMemo(() => ({
    Summary: 'summary',
    Vehicles: 'vehicles',
    'Inactive Vehicles': 'inactive-vehicles',
  } as const), [])

  const parseTabFromParam = (raw: string | null, allowed: Readonly<Tabslist[]>): Tabslist | null => {
    if (!raw) return null
    const lower = raw.toLowerCase()
    // Try slug match first
    for (const t of allowed) {
      if (tabToSlug[t] === lower) return t
    }
    // Fallback: case-insensitive label match
    for (const t of allowed) {
      if (t.toLowerCase() === lower) return t
    }
    return null
  }

  // Initialize tab from URL or localStorage, with fallback to allowed tabs
  useEffect(() => {
    // Initialize only on client
    const params = new URLSearchParams(window.location.search)
    const rawParam = params.get('tab')
    const storedRaw = typeof window !== 'undefined' ? localStorage.getItem('transapp_tab') : null

    let initial: Tabslist | null = parseTabFromParam(rawParam, allowedTabs)
    if (!initial) initial = parseTabFromParam(storedRaw, allowedTabs)
    if (!initial || !allowedTabs.includes(initial)) initial = allowedTabs[0]
    setTab(initial)
    setTabReady(true)
  }, [allowedTabs])

  // Persist tab to URL and localStorage whenever it changes
  useEffect(() => {
    if (!tab || !tabReady) return
    try {
      localStorage.setItem('transapp_tab', tabToSlug[tab])
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tabToSlug[tab])
      window.history.replaceState(null, '', url.toString())
    } catch (_) {
      // noop
    }
  }, [tab, tabToSlug, tabReady])

  // Handle browser back/forward to sync tab from URL
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('tab')
      const parsed = parseTabFromParam(raw, allowedTabs)
      if (parsed) {
        setTab(parsed)
      } else if (!allowedTabs.includes(tab)) {
        setTab(allowedTabs[0])
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [allowedTabs, tab])

  // Ensure the current tab remains valid when allowed tabs change (e.g., role switch)
  useEffect(() => {
    if (!allowedTabs.includes(tab)) {
      setTab(allowedTabs[0])
    }
  }, [allowedTabs])

  // Update vehicles/inactive vehicles when user changes
  useEffect(() => {
    console.log("User:", user);
    setVehicles(user?.vehicles)
    fetchInactiveVehicles()
  }, [user]);

  // Show back-to-top button on scroll and register keyboard shortcut (Alt+T)
  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase()
      if (e.altKey && key === 't') {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const addVehicle = async (vehicleNumber: string) => {
    console.log('adding vehicle: ', vehicleNumber);
    try {
      const fetchResponse = await fetch(`${BASE_URL}/trans-app/manage-profile/add-vehicle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNo: vehicleNumber,
          userName: user?.name
        })
      });

      const response = await fetchResponse.json();

      if (!fetchResponse.ok) {
        toast.error('Error in request', {
          description: response.message,
          richColors: true
        });
      } else {
        toast.success(response.message, {
          description: `${vehicleNumber} has been added to your profile.`,
          richColors: true
        });

        const updatedVehicles = [...(vehicles || []), vehicleNumber];

        setVehicles(updatedVehicles);

        const localUserData = JSON.parse(localStorage.getItem("adminUser")!);
        localUserData.vehicles = updatedVehicles;
        localStorage.setItem("adminUser", JSON.stringify(localUserData));
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred", { richColors: true, description: String(error) });
    }
  };

  const searchVehicle = async (vehicleNumber: string) => {
    setLoading(true);
    try {
      const vehicles = await searchItems<Vehicle>({
        url: `${BASE_URL}/searchVehicleNumber`,
        searchTerm: vehicleNumber,
        errorMessage: 'No vehicle found with the given number'
      });
      if (vehicles.length > 0) {
        setSearchModalConfig({
          isOpen: true,
          title: "Select a Vehicle",
          items: vehicles,
          onSelect: handleVehicleSelection,
          renderItem: (vehicle) => `${vehicle.VehicleNo} - ${vehicle.tripDetails.driver?.name} - ${vehicle.tripDetails.driver?.mobile}`,
          keyExtractor: (vehicle) => vehicle.VehicleNo,
        });
      }
    } catch (error) {
      console.error('Error searching for vehicle:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleVehicleSelection = (vehicle: VehicleWithTrip) => {
    setVehicleNumber(vehicle.VehicleNo);
    setSearchModalConfig((prev) => ({ ...prev, isOpen: false }));
  }

  const fetchInactiveVehicles = async () => {
    if (!user) return
    try {
      const fetchResponse = await fetch(`${BASE_URL}/trans-app/manage-profile/inactive-vehicles/${user._id}`)
      const response = await fetchResponse.json()
      if (fetchResponse.ok) {
        setInactiveVehilesList(response.deactivatedVehiclesList)
      } else {
        toast.warning(response.message, { richColors: true })
      }
      console.log('inactive vehicles response: ', response.deactivatedVehiclesList)
    } catch (error) {
      console.error(error)
      toast.error("Something went Wrong", { richColors: true })
    }
  }

  const reactivateVehicle = async (vehicleNo: string) => {
    try {
      const fetchResponse = await fetch(`${BASE_URL}/trans-app/manage-profile/reactivate-vehicle/${vehicleNo}`)
      const response = await fetchResponse.json()
      if (fetchResponse.ok) {
        setInactiveVehilesList(
          inactiveVehicles?.filter((vehicle) => vehicle.VehicleNo !== vehicleNo)
        )
        toast.success("Vehicle reactivated successfully", { richColors: true })
      } else {
        toast.warning(response.message, { richColors: true })
      }
    } catch (error) {
      console.error(error)
      toast.error("Something went Wrong", { richColors: true })
    }
  }

  return (
    <>
      {loading && <Loading />}
      {tabReady && (
      <div className='mx-4 mt-4 flex flex-col gap-4'>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Tabslist)}
          className="sm:mb-2 flex flex-col md:flex-row items-start md:items-center justify-between"
        >
          <TabsList>
            <TabsTrigger value="Summary">Vehicles Summary</TabsTrigger>
            <TabsTrigger value="Vehicles">{!user?.Division?.includes('Admin') ? "My Vehicles" : "All Vehicles"}</TabsTrigger>
            {!user?.Division?.includes('Admin') &&
              <TabsTrigger value="Inactive Vehicles">Inactive Vehicles</TabsTrigger>
            }
          </TabsList>
          {tab == "Vehicles" && <Button className='my-2 sm:my-0' onClick={() => setIsVehicleAdditionDialogvisible(true)}>Add Vehicle</Button>}
        </Tabs>
        {
          tab == "Vehicles" && vehicles &&
          <VehicleManagement user={user} />
        }
        {
          tab === "Inactive Vehicles" &&
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sn</TableHead>
                <TableHead>Vehicle no.</TableHead>
                <TableHead>Deactivated by</TableHead>
                <TableHead>Deactivation date</TableHead>
                <TableHead>Modified by</TableHead>
                <TableHead>Modification date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inactiveVehicles && inactiveVehicles.map((vehicle, index) =>
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{vehicle.VehicleNo}</TableCell>
                  <TableCell>{vehicle.UserInfo.CreatedBy}</TableCell>
                  <TableCell>{formatDate(vehicle.UserInfo.Created)}</TableCell>
                  <TableCell>{vehicle.UserInfo.ModifiedBy}</TableCell>
                  <TableCell>{formatDate(vehicle.UserInfo.Modified)}</TableCell>
                  <TableCell>
                    <div className='flex gap-2 max-w-max text-center'>
                      <Button onClick={() => { let confirmation = confirm(`Do you want to reactivate the vehicle ${vehicle.VehicleNo}?`); if (confirmation) reactivateVehicle(vehicle.VehicleNo) }} variant="destructive"><Trash2 /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        }
        {
          tab === "Summary" &&
          <VehiclesSummary user={user} />
        }
      </div>
      )}
      <SearchModal
        isOpen={searchModalConfig.isOpen}
        onClose={() => setSearchModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={searchModalConfig.title}
        items={searchModalConfig.items}
        onSelect={searchModalConfig.onSelect}
        renderItem={searchModalConfig.renderItem}
        keyExtractor={searchModalConfig.keyExtractor}
      />
      <AlertDialog open={isVehicleAdditionDialogvisible} onOpenChange={setIsVehicleAdditionDialogvisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add a vehicle in your profile</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className='text-foreground'>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input
                id="vehicleNumber"
                value={vehicleNumber}
                onChange={(e: any) => {
                  setVehicleNumber(e.target.value.toUpperCase());
                  const nativeEvent = e.nativeEvent as InputEvent;
                  if (nativeEvent.inputType === "insertText" && e.currentTarget.value.length > 3) {
                    if (e.nativeEvent.data) {
                      if (e.target.value.length > 3) {
                        searchVehicle(e.target.value);
                      }
                    }
                  }
                }}
                required
              />
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!vehicleNumber?.length || vehicleNumber.length < 9} onClick={() => { vehicleNumber && addVehicle(vehicleNumber) }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {showBackToTop && (
        <Button
          className="fixed bottom-6 right-6 rounded-full h-12 w-12 p-0 shadow-lg"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          title="Back to top (Alt+T)"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}
    </>
  )
}
