import { Types } from 'mongoose';

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

export type BowserDriver = {
    "User Id": string;
    _id: string;
    userName: string;
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
};

export interface FuelNotificationProps {
    vehicleNumber: string;
    driverId: string;
    driverMobile: string;
    driverName: string;
    quantityType: "Part" | "Full";
    fuelQuantity: string;
    bowserDriver: BowserDriver;

}

export interface FormData {
    vehicleNumberPlateImage: string | null;
    vehicleNumber: string;
    driverName: string;
    driverId: string;
    driverMobile: string;
    fuelMeterImage: string | null;
    slipImage: string | null;
    fuelQuantity: string;
    quantityType: 'Full' | 'Part';
    gpsLocation: string;
    fuelingDateTime: string;
    bowserDriver: {
        _id: Types.ObjectId;
        userName: string;
        userId: string;
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