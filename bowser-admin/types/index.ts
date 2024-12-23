import mongoose from "mongoose";

export interface Driver {
    Name: string;
    ITPLId: string | null;
    MobileNo?: Array<{
        MobileNo: string;
        IsDefaultNumber: boolean;
        LastUsed: boolean;
    }>;
}

// Define the BowserResponse interface
export interface BowserResponse {
    regNo: string;
    bowserDriver: ResponseBowser;
}

export interface ResponseBowser {
    bowser: any;
    bowserDetails: {

    },
    tripSheetId: string,
    regNo: string;
    _id: string;
    bowserDriver: Array<{
        id: string;
        name: string;
        phoneNo: string;
    }>
    ;
}

export interface Bowser {
    _id: string;
    regNo: string;
    odometerReading: string;
    fuelingMachineID: string;
    pumpReadingBeforeLoadingStart: string;
    pumpReadingAfterLoadingEnd: string;
    chamberDipListBeforeLoadingStart: string[];
    chamberDipListAfterLoadingEnd: string[];
    chamberSealList: string[];
    pumpSlips: PumpSlip[];
    totalLoadQuantityBySlip: string;
    totalLoadQuantityByDip: string;
    currentTrip: TripSheet;
    trips: Trip[];
}

export interface PumpSlip {
    quantity: string;
    slipPhoto: string;
    bowserTankChamberID: string;
}

export interface Trip {
    tripId: string;
    settled: boolean;
}

export interface TripSheet {
    _id?: string;
    tripSheetId: number;
    dispenses?: { transaction: string, isVerified: boolean }[];
    tripSheetGenerationDateTime?: Date;
    bowserDriver: {
        handOverDate: Date;
        name: string;
        phoneNo: string;
    }[];
    bowser: {
        regNo: string;
    };
    bowserOdometerStartReading?: number;
    fuelingAreaDestination?: string;
    bowserPumpEndReading?: string;
    proposedDepartureDateTime?: string;
    loadQuantityByDip?: {
        [key: string]: any;
    };
    loadQuantityBySlip?: {
        [key: string]: any;
    };
    chamberWiseDipList?: {
        chamber1?: any;
        chamber2?: any;
        chamber3?: any;
        chamber4?: any;
    }[];
    chamberWiseSealList?: {
        chamber1?: any;
        chamber2?: any;
        chamber3?: any;
        chamber4?: any;
    }[];
    referenceToBowserLoadingSheetID?: string;
    settelment: {
        dateTime?: string;
        odometerClosing?: {
            [key: string]: any;
        };
        bowserNewEndReading?: {
            [key: string]: any;
        };
        settled: boolean;
    };
}

export interface User {
    _id: mongoose.Schema.Types.ObjectId;
    userId: string;
    phoneNumber: string;
    phoneNo?: string;
    name: string;
    bowserId: string;
    verified: boolean;
    roles: Role[];
    generationTime: Date;
}

export interface Role {
    _id: mongoose.Schema.Types.ObjectId;
    name: string;
    permissions: {
        apps: { name: string; access: 'read' | 'write' | 'admin' | null }[];
        functions: { name: string; allowed: boolean }[];
        customPermissions: Record<string, any>;
    };
}

export interface UnauthorizedLogin {
    _id: string,
    userId: string,
    name: string,
    phoneNumber: string,
    registeredDeviceUUID: string,
    attemptedDeviceUUID: string,
    timestamp: Date,
}

export interface Vehicle {
    VehicleNo: string;
    tripDetails: {
        driver: TripDriver
        open: boolean
    }
}
export interface AttachedVehicle {
    VehicleNo: string;
    TransportPartenName: string;
}

export interface TripDriver {
    name: string;
    id: string | null;
    mobile?: string;
}

export interface DispensesRecord {
    _id: string;
    orderId: string,
    category: string;
    party: string;
    tripSheetId: string;
    vehicleNumberPlateImage: string,
    vehicleNumber: string,
    odometer: string,
    driverName: string,
    driverId: string,
    driverMobile: string,
    fuelMeterImage: string[],
    slipImage: string,
    fuelQuantity: string,
    quantityType: string,
    gpsLocation: string,
    fuelingDateTime: string,
    verified: boolean,
    posted: boolean,
    bowser: {
        regNo: string,
        driver: {
            name: string,
            id: string
            phoneNo: string
        }
    },
    allocationAdmin: {
        name: string,
        id: string
    },
}


export interface Filters {
    driverName: string;
    bowserRegNo: string;
    tripSheetId: string;
    unsettled: boolean;
}

export interface Sort {
    field: string;
    order: 'asc' | 'desc';
}

export type FuelingTypes = 'Own' | 'Attatch' | 'Bulk Sale'