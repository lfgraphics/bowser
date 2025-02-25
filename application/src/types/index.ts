export interface FuelRequest {
    _id: string
    vehicleNumber: string
    driverId: string
    driverName: string
    driverMobile: string
    location: string
    fulfilled: boolean
    createdAt: string
    allocation?: {
        bowser: {
            driver: {
                name: string
                phoneNo: string
                location?: string
            },
            regNo: string
        },
        allocationAdmin: {
            name: string
            id: string
        },
        _id: string
        category: string
        party: string
        quantityType: "Part" | "Full"
        fuelQuantity: number
        fulfilled: boolean
        createdAt: string
    }
}