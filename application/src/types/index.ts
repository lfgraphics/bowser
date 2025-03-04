import { FuelRequest } from "./models"

export interface DriverFuelRequest {
    _id: string
    vehicleNumber: string
    driverId: string
    driverName: string
    driverMobile: string
    location: string
    fulfilled: boolean
    createdAt: string
    allocation: FuelRequest
}