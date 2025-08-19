"use client"
import React, { useContext, useEffect, useState } from 'react'

import { Ban, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import ImageFromBufferObject from '@/components/ImageFromBuffer'
import { BASE_URL } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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

type Tabslist = "Vehicles" | "Inactive Vehicles" | "Summary"

export default function Page() {
  const { user, photo } = useContext(TransAppContext);
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tabslist>("Summary")
  const [vehicles, setVehicles] = useState<string[]>()
  const [vehicleNumber, setVehicleNumber] = useState<string>()
  const [isVehicleAdditionDialogvisible, setIsVehicleAdditionDialogvisible] = useState(false)
  const [inactiveVehicles, setInactiveVehilesList] = useState<InactiveVehicles[]>()
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

  useEffect(() => {
    console.log("User:", user);
    setVehicles(user?.vehicles)
    fetchInactiveVehicles()
  }, [user]);

  const deleteVehicle = async (vehicleNumber: string) => {
    console.log('deleting vehicle: ', vehicleNumber);
    try {
      const fetchResponse = await fetch(`${BASE_URL}/trans-app/manage-profile/delete-vehicle`, {
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
          description: response.error,
          richColors: true
        });
      } else {
        toast.success(response.message, {
          description: `${vehicleNumber} has been deleted from your profile.`,
          richColors: true
        });

        const updatedVehicles = vehicles?.filter((v) => v !== vehicleNumber) || [];

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

  const deActivateVehicle = async (vehicleNumber: string) => {
    console.log('deleting vehicle: ', vehicleNumber);
    try {
      const fetchResponse = await fetch(`${BASE_URL}/trans-app/manage-profile/deactivate-vehicle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNo: vehicleNumber,
          userName: user?.name
        })
      });
      if (!fetchResponse.ok) {
        let errorResponse = await fetchResponse.json();
        toast.error('Error in request', {
          description: errorResponse.error,
          richColors: true
        });
      } else {
        let response = await fetchResponse.json();
        console.log("Response:", response); // Log to inspect
        toast.success(response.message, {
          description: typeof response.entry === 'object' ? `${response.entry.VehicleNo} hase been deactivated for your profile.` : response.entry,
          richColors: true
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred", { richColors: true, description: String(error) });
    }
  }

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
      <div className='mx-4 mt-4 flex flex-col gap-4'>
        <Card className='w-fit'>
          <CardContent>
            <CardHeader className='font-semibold'>User Profile</CardHeader>
            <ImageFromBufferObject bufferObject={photo} className='rounded-full w-20 h-20' />
            <p><strong>Name: </strong>{user?.name}</p>
            <p><strong>Vehicles: </strong>{vehicles?.length}</p>
          </CardContent>
        </Card>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Tabslist)}
          className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between"
        >
          <TabsList>
            <TabsTrigger value="Vehicles">My Vehicles</TabsTrigger>
            <TabsTrigger value="Inactive Vehicles">Inactive Vehicles</TabsTrigger>
            <TabsTrigger value="Summary">Vehicles Summary</TabsTrigger>
          </TabsList>
          <Button onClick={() => setIsVehicleAdditionDialogvisible(true)}>Add Vehicle</Button>
        </Tabs>
        {
          tab == "Vehicles" && vehicles &&
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sn</TableHead>
                <TableHead>Vehicle no.</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle, index) =>
                <TableRow key={index} className={`${inactiveVehicles?.findIndex((inactive) => inactive.VehicleNo == vehicle) !== -1 ? "bg-red-300" : ""}`}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{vehicle}</TableCell>
                  <TableCell>
                    <div className='flex gap-2 max-w-max text-center'>
                      <Button onClick={() => { let confirmation = confirm(`Do you want to delete the vehicle ${vehicle}?`); if (confirmation) deleteVehicle(vehicle) }} variant="destructive"><Trash2 /></Button>
                      {inactiveVehicles?.findIndex((inactive) => inactive.VehicleNo == vehicle) == -1 &&
                        <Button onClick={() => { let confirmation = confirm(`Do you want to deactivate the vehicle ${vehicle}?`); if (confirmation) deActivateVehicle(vehicle) }} variant="secondary"><Ban /></Button>
                      }
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
          <VehiclesSummary />
        }
      </div>
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
    </>
  )
}
