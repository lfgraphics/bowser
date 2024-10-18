export interface Vehicle {
    vehicleNumber: string;
    type: string;
    capacity: number;
    lastMaintenanceDate: Date;
}

export interface Driver {
    Name: string;
    ITPLId: string | null;
    MobileNo?: Array<{
        MobileNo: string;
        IsDefaultNumber: boolean;
        LastUsed: boolean;
    }>;
}

export interface FormData {
    vehicleNumberPlateImage: string | null;
    vehicleNumber: string;
    driverName: string;
    driverId: string;
    driverMobile: string;
    fuelMeterImage: string | null;
    fuelQuantity: string;
    quantityType: 'Full' | 'Part';
    gpsLocation: string;
    fuelingDateTime: string;
}