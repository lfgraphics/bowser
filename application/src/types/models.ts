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

export interface PrePopulatedFuelingData {
    vehicleNumber: string;
    driverId: string;
    driverName: string;
    driverMobile: string;
    quantityType: 'Full' | 'Part';
    fuelQuantity: string;
    bowserDriver: {
        _id?: Types.ObjectId;
        userName?: string;
        userId: string;
    };
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