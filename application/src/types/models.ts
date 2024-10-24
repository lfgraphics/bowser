import { Types } from 'mongoose';

export interface Vehicle {
    VehicleNo: string;
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
    quantityType: "Full" | "Part" | 'N/A';
    vehicleNumber: string;
    allocationAdmin?: {
        _id: string;
        userName: string;
        userId: string;
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
    bowserDriver: BowserDriver;
    allocationAdmin: {
        _id: string;
        userName: string;
        userId: string;
    };

}

export interface FormData {
    orderId?: Types.ObjectId;
    vehicleNumberPlateImage: string | null;
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
    bowserDriver: {
        _id: Types.ObjectId;
        userName: string;
        userId: string;
    };
    allocationAdmin?: {
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