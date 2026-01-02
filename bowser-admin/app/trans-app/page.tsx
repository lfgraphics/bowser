"use client"
import React, { useContext, useEffect, useMemo, useState } from 'react'

import { Trash2, ChevronUp, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'

import MorningUpdateForm from '@/components/transappComponents/MorningUpdateForm'
import MorningUpdateReport, { MorningUpdateReportData as ReportDataTypeAlias } from '@/components/transappComponents/MorningUpdateReport'
import MorningUpdatesView from '@/components/transappComponents/MorningUpdatesView'
import VehicleManagement from '@/components/transappComponents/VehicleManagement'
import VehiclesSummary from '@/components/transappComponents/VehiclesSummary'
import VehiclesSummaryOptimized from '@/components/transappComponents/VehiclesSummaryOptimized'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { BASE_URL } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { InactiveVehicles, Vehicle, VehicleWithTrip } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchModal } from '@/components/SearchModal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TabsTrigger, Tabs, TabsList } from '@/components/ui/tabs'
import { formatDate } from '@/lib/utils'
import { loadFormData, saveFormData } from '@/lib/storage'
import { searchItems } from '@/utils/searchUtils'

import Loading from '../loading'
import { TransAppContext } from "./layout";
import SupervisorMorningUpdatesView from '@/components/transappComponents/SupervisorMorningUpdatesView'

type Tabslist = "Vehicles" | "Inactive Vehicles" | "Summary" | "Morning Updates" | "Supervisors Morning Updates";

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
  const [showMorningUpdateButton, setShowMorningUpdateButton] = useState<boolean>(false)
  const [isMorningUpdateDialogOpen, setIsMorningUpdateDialogOpen] = useState<boolean>(false)
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

  // Morning Update Report types and state
  type MorningUpdateReportData = {
    user: { name: string },
    date: string,
    openingTime: string,
    closingTime: string,
    vehicles: Array<{
      vehicleNo: string,
      remark: string,
      location: string,
      plannedFor: string,
      unloadedAt: string,
      driverName: string,
      isReported: boolean
    }>
  } | null;
  const [morningUpdateReportData, setMorningUpdateReportData] = useState<MorningUpdateReportData>(null);
  const [showMorningUpdateReport, setShowMorningUpdateReport] = useState<boolean>(false);

  // Determine allowed tabs based on user (Inactive Vehicles hidden for Admins)
  const allowedTabs = useMemo<Readonly<Tabslist[]>>(() => {
    const isAdmin = !!user?.Division?.includes('Admin')
    return isAdmin ? ["Summary", "Vehicles", "Morning Updates"] : ["Summary", "Vehicles", "Inactive Vehicles"]
  }, [user])

  // Utility to map between tabs and URL slugs
  const tabToSlug = useMemo(() => ({
    Summary: 'summary',
    Vehicles: 'vehicles',
    'Inactive Vehicles': 'inactive-vehicles',
    'Morning Updates': 'morning-updates',
    'Supervisors Morning Updates': 'supervisors-morning-updates',
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

  // Morning Update helpers
  const isBeforeCutoffTime = (time: Date): boolean => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    return hours < 9 || (hours === 9 && minutes < 45);
  };
  const getSubmissionFlagKey = () => `morningUpdate_submitted_${new Date().toISOString().split('T')[0]}`;
  const checkSubmissionStatus = async (): Promise<boolean> => {
    try {
      const submitted = await loadFormData<boolean>(getSubmissionFlagKey());
      return Boolean(submitted);
    } catch {
      return false;
    }
  };
  const markAsSubmitted = async () => {
    try {
      await saveFormData(getSubmissionFlagKey(), true);
    } catch (e) {
      // non-blocking
      console.warn('Failed to persist morning update submission flag', e);
    }
  };

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

  // Manage Morning Update button visibility (check only once per mount)
  useEffect(() => {
    if (!user?._id) {
      setShowMorningUpdateButton(false);
      return;
    }

    let mounted = true;

    const evaluate = async () => {
      if (!mounted) return;
      const now = new Date();
      const beforeCutoff = isBeforeCutoffTime(now);
      const submitted = await checkSubmissionStatus();
      if (!mounted) return;
      setShowMorningUpdateButton(beforeCutoff && !submitted);
    };

    // Evaluate only once on mount
    evaluate();

    return () => {
      mounted = false;
    };
  }, [user?._id])

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

  // On successful morning update submission
  const handleMorningUpdateSuccess = async (reportData: ReportDataTypeAlias) => {
    await markAsSubmitted();
    setShowMorningUpdateButton(false);
    setMorningUpdateReportData(reportData);
    setShowMorningUpdateReport(true);
    // toast is already handled inside the form; optionally we could add another toast here
  };

  const handleCloseReport = () => {
    setShowMorningUpdateReport(false);
    // optional: clear data after close animation
    setTimeout(() => setMorningUpdateReportData(null), 300);
  };

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
            <TabsList className='w-fit max-w-full overflow-auto'>
              <TabsTrigger value="Summary">Vehicles Summary</TabsTrigger>
              <TabsTrigger value="Vehicles">{!user?.Division?.includes('Admin') ? "My Vehicles" : "All Vehicles"}</TabsTrigger>
              {user?.Division?.includes('Admin') &&
                <TabsTrigger value="Morning Updates">Morning Updates</TabsTrigger>
              }
              {!user?.Division?.includes('Admin') &&
                <TabsTrigger value="Supervisors Morning Updates">Morning Updates</TabsTrigger>
              }
              {!user?.Division?.includes('Admin') &&
                <TabsTrigger value="Inactive Vehicles">Inactive Vehicles</TabsTrigger>
              }
            </TabsList>
            {tab == "Vehicles" && !user?.Division.includes('Admin') && <Button className='my-2 sm:my-0' onClick={() => setIsVehicleAdditionDialogvisible(true)}>Add Vehicle</Button>}
          </Tabs>
          {
            tab == "Vehicles" && vehicles &&
            <VehicleManagement user={user} />
          }
          {
            tab === "Supervisors Morning Updates" &&
            <SupervisorMorningUpdatesView userId={user?._id} />
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
            // <VehiclesSummary user={user} />
            <VehiclesSummaryOptimized user={user} />
          }
          {
            tab === "Morning Updates" &&
            <MorningUpdatesView />
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

      {showMorningUpdateButton && user && !user?.Division?.includes("Admin") && (
        <Button
          className="sticky bottom-6 left-6 rounded-lg px-4 py-2 shadow-lg"
          onClick={() => setIsMorningUpdateDialogOpen(true)}
          aria-label="Submit Morning Update"
          title="Submit Morning Update (before 9:45 AM)"
        >
          <ClipboardList className="mr-2 h-4 w-4" /> Morning Update
        </Button>
      )}

      <MorningUpdateForm
        isOpen={isMorningUpdateDialogOpen}
        onClose={() => setIsMorningUpdateDialogOpen(false)}
        user={user}
        onSuccess={handleMorningUpdateSuccess}
      />

      {morningUpdateReportData && (
        <MorningUpdateReport
          isOpen={showMorningUpdateReport}
          onClose={handleCloseReport}
          reportData={morningUpdateReportData}
        />
      )}
    </>
  )
}
