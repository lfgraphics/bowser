export interface Driver {
    Name: string;
    ITPLId: string | null;
    MobileNo?: Array<{
        MobileNo: string;
        IsDefaultNumber: boolean;
        LastUsed: boolean;
    }>;
}

export interface Vehicle {
    VehicleNo: string;
    type: string;
    capacity: number;
    lastMaintenanceDate: Date;
    driverDetails: Driver;
}

export type BowserDriver = {
    id: string;
    name: string;
};

export type FuelingOrderData = {
    _id: string;
    bowserDriver: BowserDriver;
    driverId: string;
    driverMobile?: string;
    driverName: string;
    fuelQuantity: number;
    quantityType: "Full" | "Part" | 'N/A';
    vehicleNumber: string;
    bowser: {
        regNo: string;
        driver: {
            id: string;
            name: string;
        }
    };
    allocationAdmin?: {
        name: string;
        id: string;
        phoneNo: string;
    };
};

export interface FuelNotificationProps {
    orderId: string;
    vehicleNumber: string;
    driverId: string;
    driverMobile: string;
    driverName: string;
    quantityType: "Part" | "Full" | "N/A";
    quantity: string;
    bowser: {
        regNo: string;
        driver: BowserDriver;
    };
    allocationAdmin: {
        name: string;
        id: string;
        phoneNo: string;
    };

}

export interface FormData {
    orderId?: string;
    vehicleNumberPlateImage: string | null;
    tripSheetId: string,
    vehicleNumber: string;
    driverName: string;
    driverId: string;
    driverMobile: string;
    fuelMeterImage: string | null;
    slipImage: string | null;
    fuelQuantity: string;
    quantityType: 'Full' | 'Part' | 'N/A';
    gpsLocation: string;
    fuelingDateTime: string;
    bowser: {
        regNo: string,
        driver: {
            name: string;
            id: string;
            phoneNo: string;
        }
    };
    allocationAdmin?: {
        name: string;
        id: string;
    };
}
export interface UserData {
    _id: string;
    userId: string;
    name: string;
    phoneNumber: string;
    verified: boolean;
    roles: Array<{
        name: string;
        permissions: {
            apps: Array<{
                name: string;
                access: 'read' | 'write' | 'admin' | null;
            }>;
            functions: Array<{
                name: string;
                allowed: boolean | null;
            }>;
            customPermissions: {
                canAccessUI: boolean;
                [key: string]: any;
            };
        };
    }>;
}

export interface TripSheet {
    tripSheetId: string;
    settelment: {
        settled: boolean;
    };
    // Add any other fields from your TripSheet schema that you might need
};
