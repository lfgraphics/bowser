"use client"
import { useState, useEffect } from 'react'
import { BASE_URL } from '@/lib/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import Combobox, { ComboboxOption } from '../Combobox'
import RouteForm, { RouteFormData } from './RouteForm'
import { Loader2, Search, Trash2 } from 'lucide-react'
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '../ui/alert-dialog'
import { Button } from '../ui/button'

const UpdateRoute = () => {
    const [selectedRouteId, setSelectedRouteId] = useState<string>("")
    const [routeSearch, setRouteSearch] = useState<string>("")
    const [routeOptions, setRouteOptions] = useState<ComboboxOption[]>([])
    const [loading, setLoading] = useState(false)
    const [fetchingRoute, setFetchingRoute] = useState(false)
    const [selectedRouteData, setSelectedRouteData] = useState<RouteFormData | null>(null)

    // Fetch routes for search
    useEffect(() => {
        const searchRoutes = async () => {
            if (routeSearch.length < 2) {
                setRouteOptions([])
                return
            }
            try {
                const response = await fetch(`${BASE_URL}/trans-app/routes?search=${routeSearch}`)
                const data = await response.json()
                const formattedOptions: ComboboxOption[] = data.map((r: any) => ({
                    value: r._id,
                    label: `${r.Name} (${r.Country})`
                }))
                setRouteOptions(formattedOptions)
            } catch (error) {
                console.error('Error searching routes:', error)
            }
        }
        
        const timer = setTimeout(searchRoutes, 300)
        return () => clearTimeout(timer)
    }, [routeSearch])

    // Load selected route details
    useEffect(() => {
        const fetchRouteDetails = async () => {
            if (!selectedRouteId) {
                setSelectedRouteData(null)
                return
            }
            
            setFetchingRoute(true)
            try {
                const response = await fetch(`${BASE_URL}/trans-app/routes/${selectedRouteId}`)
                const data = await response.json()
                
                // Ensure all fields are present with correct defaults
                const formData: RouteFormData = {
                    Name: data.Name || '',
                    Country: data.Country || 'India',
                    From: data.From || '',
                    To: data.To || '',
                    Via: data.Via || '',
                    Distance: Number(data.Distance) || 0,
                    NoofToll: Number(data.NoofToll) || 0,
                    PumpDetail: (data.PumpDetail || []).map((pump: any) => ({
                        PumpName: pump.PumpName || '',
                        StartPoint: Number(pump.StartPoint) || 0,
                        OffRoad: Number(pump.OffRoad) || 0,
                        EndPoint: Number(pump.EndPoint) || 0
                    }))
                }
                
                setSelectedRouteData(formData)
            } catch (error) {
                console.error('Error fetching route details:', error)
                toast.error('Failed to load route details')
            } finally {
                setFetchingRoute(false)
            }
        }
        
        fetchRouteDetails()
    }, [selectedRouteId])

    const handleUpdate = async (formData: RouteFormData) => {
        if (!selectedRouteId) return

        setLoading(true)
        try {
            const response = await fetch(`${BASE_URL}/trans-app/routes/${selectedRouteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update route')
            }

            const result = await response.json()
            toast.success('Route updated successfully!')
            
            // Update local state with returned data
            setSelectedRouteData({
                Name: result.Name || '',
                Country: result.Country || 'India',
                From: result.From || '',
                To: result.To || '',
                Distance: Number(result.Distance) || 0,
                NoofToll: Number(result.NoofToll) || 0,
                PumpDetail: (result.PumpDetail || []).map((pump: any) => ({
                    PumpName: pump.PumpName || '',
                    StartPoint: Number(pump.StartPoint) || 0,
                    OffRoad: Number(pump.OffRoad) || 0,
                    EndPoint: Number(pump.EndPoint) || 0
                }))
            })
        } catch (error) {
            console.error('Error updating route:', error)
            toast.error('Failed to update route', {
                description: error instanceof Error ? error.message : 'Unknown error occurred'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedRouteId) return

        setLoading(true)
        try {
            const response = await fetch(`${BASE_URL}/trans-app/routes/${selectedRouteId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to delete route')
            }

            toast.success('Route deleted successfully!')
            setSelectedRouteId("")
            setSelectedRouteData(null)
            setRouteSearch("")
        } catch (error) {
            console.error('Error deleting route:', error)
            toast.error('Failed to delete route', {
                description: error instanceof Error ? error.message : 'Unknown error occurred'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card className="w-full bg-muted/20 border-dotted border-2">
                <CardHeader className="pb-3 px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Search className="h-5 w-5 text-primary shrink-0" />
                                <span>Find Route to Update</span>
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Search by route name, from location, or to location.
                            </CardDescription>
                        </div>
                        {selectedRouteId && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="gap-2 w-full sm:w-auto">
                                        <Trash2 className="h-4 w-4" />
                                        Delete Route
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[95vw] max-w-lg rounded-lg">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete 
                                            <span className="font-bold text-foreground"> "{selectedRouteData?.Name}" </span> 
                                            and remove its data from our servers.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                                        <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={handleDelete}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                                        >
                                            Delete Permanently
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-6">
                    <div className="w-full max-w-xl">
                        <Combobox
                            className="w-full"
                            options={routeOptions}
                            value={selectedRouteId}
                            onChange={setSelectedRouteId}
                            searchTerm={routeSearch}
                            onSearchTermChange={setRouteSearch}
                            placeholder="Type to search routes..."
                        />
                    </div>
                </CardContent>
            </Card>

            {fetchingRoute && (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Loading route details...</p>
                </div>
            )}

            {selectedRouteData && !fetchingRoute && (
                <RouteForm
                    initialData={selectedRouteData}
                    onSubmit={handleUpdate}
                    submitLabel="Update Route"
                    loading={loading}
                    title={`Updating: ${selectedRouteData.Name}`}
                    description="Review and modify the route details below."
                />
            )}
            
            {!selectedRouteId && !fetchingRoute && (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/5">
                    <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground italic">Select a route above to see its details</p>
                </div>
            )}
        </div>
    )
}

export default UpdateRoute
