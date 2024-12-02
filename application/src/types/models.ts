export interface Driver {
    Name: string;
    ITPLId: string | null;
    MobileNo?: Array<{
        MobileNo: string;
        IsDefaultNumber: boolean;
        LastUsed: boolean;
    }>;
}

export type FuelingTypes = 'Own' | 'Attatch' | 'Bulk Sale'

export interface Vehicle {
    VehicleNo: string;
    tripDetails: TripDetails;
}

export interface VehicleDriver {
    id: string,
    Name: string,
    MobileNo: string,
}

export interface TripDetails {
    id: string,
    driver: VehicleDriver
    open: boolean
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
    quantityType: "Full" | "Part";
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
        allocationTime: string;
    };
};

export interface FuelNotificationProps {
    orderId: string;
    vehicleNumber: string;
    driverId: string;
    driverMobile: string;
    driverName: string;
    quantityType: "Part" | "Full";
    quantity: string;
    bowser: {
        regNo: string;
        driver: BowserDriver;
    };
    allocationAdmin: {
        name: string;
        id: string;
        allocationTime: string;
    };

}

export interface AppUpdates {
    _id: string,
    buildVersion: number,
    url: string,
    pushDate: Date
}

export interface FormData {
    category: FuelingTypes;
    party: string;
    odometer: string;
    orderId?: string;
    vehicleNumberPlateImage: string | null;
    tripSheetId: number,
    vehicleNumber: string;
    driverName: string;
    driverId: string;
    driverMobile: string;
    fuelMeterImage: string[] | null;
    slipImage: string | null;
    fuelQuantity: string;
    quantityType: 'Full' | 'Part' | 'N/A';
    gpsLocation: string;
    fuelingDateTime: Date;
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
