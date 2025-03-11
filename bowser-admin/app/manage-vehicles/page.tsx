"use client"
import { User, Vehicle } from '@/types'
import React, { useEffect, useState } from 'react'
import { Table, TableBody, TableHeader, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { BASE_URL } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/auth'
import SearchInput from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogContent } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea'
import Loading from '../loading'

/*
- we will render all the non managed vehicles in one tab
- we will render only the managed vehicels in another tab
- we will have a search bar to search for vehicles
- we will open a modal on clicking on a vehicle to view the details of the vehicle, the same modal will be used to edit the vehicle
*/

type Nav = 'all' | 'own';

const VehicleManagementPage = () => {
    const [loading, setLoading] = useState(true)
    const [renderType, setRenderType] = useState<'all' | 'own'>('all')
    const [vehicles, setVehicles] = useState<Vehicle[]>()
    const [error, setError] = useState<string>('')
    const [query, setQuery] = useState<string>('')
    const [isReportDialogueOpen, setIsReportDialogueOpen] = useState<boolean>(false)
    const [reportVehicle, setReportVehicle] = useState<string>()
    const [reportMessage, setReportMessage] = useState<string>('')
    const [limit, setLimit] = useState<string>('20')
    const [select, setSelected] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>()

    const fetchVehicle = async () => {
        try {
            setLoading(true)
            let manager = renderType !== 'all' ? currentUser?.userId : null
            const response = await fetch(`${BASE_URL}/vehicle`, {
                method: 'POST',
                cache: 'force-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query, limit, manager })
            })
            if (!response.ok) {
                const error = await response.json()
                setError(error)
                console.log('fetchVehicle error: ', error)
            }
            const vehicleDetails: Vehicle[] = await response.json()
            setVehicles(vehicleDetails)
            console.log('vehicles: ', vehicleDetails)
        } catch (err: any) {
            setError(err)
            console.log('catch error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVehicle()
    }, [limit, query, renderType])

    useEffect(() => {
        let user = getCurrentUser() as User | null
        console.log(user)
        setCurrentUser(user)
    }, [])

    const toggleRowSelection = (id: string) => {
        setSelected((prev) => {
            const newSelectedRows = new Set(prev);
            if (newSelectedRows.has(id)) {
                newSelectedRows.delete(id); // Deselect if already selected
            } else {
                newSelectedRows.add(id); // Select if not selected
            }
            return newSelectedRows;
        });
    };

    const ownVehicle = async (id: string) => {
        try {
            setLoading(true)
            const response = await fetch(`${BASE_URL}/vehicle/${id}/manager`, {
                method: 'PUT',
                cache: 'force-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ manager: currentUser?.userId })
            })
            if (!response.ok) {
                const error = await response.json()
                setError(error)
                console.log('update vehicle manager error: ', error)
            }
            const vehicleDetails: Vehicle = await response.json()
            setVehicles(prev =>
                prev?.map(vehicle =>
                    vehicle._id === id ? vehicleDetails : vehicle
                )
            )
        } catch (err: any) {
            setError(err)
            console.log('catch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const submitIssue = async () => {
        if (reportMessage?.length > 15) {
            setLoading(true)
            setError('')
            try {
                const response = await fetch(`${BASE_URL}/reports`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ reportId: reportVehicle, reportMessage, reporter: currentUser?.userId, devPersonal: 'Vehicle Management page' })
                })
                if (!response.ok) {
                    const error = await response.json()
                    setError(error)
                    console.log('fetchVehicle error: ', error)
                }
                const jsonResponse = await response.json()
                console.log('vehicles: ', jsonResponse)
            } catch (err: any) {
                setError(err)
                console.log('catch error:', err)
            } finally {
                setLoading(false)
                setIsReportDialogueOpen(false)
                setReportMessage('')
                setReportVehicle('')
            }
        } else {
            alert('Minimum 15 charecters are required to report an issue')
        }
    }

    return (
        <React.Fragment>
            {loading && <Loading />}
            <div className="main m-4 flex flex-col gap-6">
                <div className="query-container flex gap-4">
                    <SearchInput
                        onChange={(e) => { setQuery(e.target.value) }}
                        placeholder='Enter a value to filter'
                    />
                    <Select value={limit} onValueChange={(value) => setLimit(value)}>
                        <SelectTrigger className="flex justify-between items-center p-2 border rounded w-full">
                            <SelectValue placeholder="Select Limit" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">
                                10
                            </SelectItem>
                            <SelectItem value="20">
                                20
                            </SelectItem>
                            <SelectItem value="40">
                                40
                            </SelectItem>
                            <SelectItem value="50">
                                50
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {String(error)}
                <div className="flex flex-row gap-3 max-w-sm justify-center mx-auto">
                    {(['all', 'own'] as Nav[]).map((option, index) => (
                        <Button key={index} variant={renderType == option ? 'default' : 'secondary'} onClick={() => setRenderType(option)}>{option == 'all' ? 'All' : 'My managed'}</Button>
                    ))}
                </div>
                <Table>
                    <TableRow>
                        <TableHead>Sr no.</TableHead>
                        <TableHead></TableHead>
                        <TableHead>Vehicle No.</TableHead>
                        <TableHead>Driver (Name & Id)</TableHead>
                        <TableHead>Goods Category</TableHead>
                        <TableHead>Trip Status</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableCell className='text-center'>Action</TableCell>
                    </TableRow>
                    <TableBody>
                        {vehicles?.map((vehicle, index) => (
                            <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell onClick={() => toggleRowSelection(vehicle._id)}><Checkbox checked={select.has(vehicle._id)} /></TableCell>
                                <TableCell>{vehicle.VehicleNo}</TableCell>
                                <TableCell>{typeof vehicle.tripDetails.driver == 'object' ? vehicle?.tripDetails?.driver?.Name + " - " + vehicle?.tripDetails?.driver?.id : vehicle.tripDetails.driver}</TableCell>
                                <TableCell>{vehicle.GoodsCategory}</TableCell>
                                <TableCell><Badge variant={vehicle.tripDetails.open ? "succes" : "destructive"} >{vehicle.tripDetails.open ? "Open" : "Closed"}</Badge></TableCell>
                                <TableCell>{vehicle.manager}</TableCell>
                                <TableCell><div className="flex gap-2 justify-center">{!vehicle.manager && <Button onClick={() => ownVehicle(vehicle._id)} >Own</Button>}<Button onClick={() => { setReportVehicle(vehicle._id); setIsReportDialogueOpen(true) }} variant="outline">Report</Button></div></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <AlertDialog open={isReportDialogueOpen} onOpenChange={setIsReportDialogueOpen}>
                <AlertDialogContent>
                    <AlertDialogTitle>Report an issue</AlertDialogTitle>
                    <Textarea value={reportMessage} placeholder='Type your message...' onChange={(e) => setReportMessage(e.target.value)}></Textarea>
                    <Button onClick={() => submitIssue()} >Submit</Button>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogContent>
            </AlertDialog>
        </React.Fragment>
    )
}

export default VehicleManagementPage
