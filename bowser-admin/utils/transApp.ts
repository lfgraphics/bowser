import { BASE_URL } from "@/lib/api"

export const fetchLoadedButUnloadedTrips = async (userId: string) => {
    const response = await fetch(`${BASE_URL}/trans-app/vehicles/loaded-not-unloaded?userId=${userId}`)
    const tripsData = await response.json()
    const { loadedVehicles, count, vehiclesCount } = tripsData
    return loadedVehicles
} 