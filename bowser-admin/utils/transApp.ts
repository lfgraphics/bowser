import { BASE_URL } from "@/lib/api"

export const fetchLoadedButUnloadedTrips = async (userId: string) => { // unloading tracker
    const response = await fetch(`${BASE_URL}/trans-app/vehicles/loaded-not-unloaded?userId=${userId}`)
    const tripsData = await response.json()
    const { loadedVehicles, count, vehiclesCount } = tripsData
    return loadedVehicles
}

export const fetchUnloadedButNotPlanned = async (userId: string) => { // loading planner
    const response = await fetch(`${BASE_URL}/trans-app/vehicles/unloaded-not-planned?userId=${userId}`)
    const tripsData = await response.json()
    const { unplannedTrips, count, vehiclesCount } = tripsData
    return unplannedTrips
} 
export const fetchUnloadedButPlanned = async (userId: string) => { // loading tracker
    const response = await fetch(`${BASE_URL}/trans-app/vehicles/unloaded-planned?userId=${userId}`)
    const tripsData = await response.json()
    return tripsData
} 