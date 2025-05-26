import { FuelRequest } from "./models"

export interface DriverFuelRequest {
    _id: string
    vehicleNumber: string
    odometer:string
    driverId: string
    driverName: string
    driverMobile: string
    location: string
    tripId:string
    fulfilled: boolean
    createdAt: string
    allocation: FuelRequest
    message: string
}