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
    bowserDetails: {

    },
    regNo: string;
    _id: string;
    bowserDriver: {
        _id: mongoose.Schema.Types.ObjectId;
        id: string;
        name: string;
    };
}

export interface Bowser {
    regNo: string;
    currentTrip: {
        _id: mongoose.Schema.Types.ObjectId;
        bowserDriver: {
            _id: mongoose.Schema.Types.ObjectId;
            userId: string;
            userName: string;
        };
    };
}
export interface User {
    _id: string;
    userId: string;
    name: string;
}
export interface Vehicle {
    VehicleNo: string;
}

export interface DispensesRecord {
    _id: mongoose.Schema.Types.ObjectId;
    orderId: mongoose.Schema.Types.ObjectId,
    tripSheetId: string;
    vehicleNumberPlateImage: string,
    vehicleNumber: string,
    driverName: string,
    driverId: string,
    driverMobile: string,
    fuelMeterImage: string,
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
        name: { type: string, required: false },
        userId: { type: string, required: false }
    },
}

export interface TripSheet {
    _id?: string;
    tripSheetId: string;
    tripSheetGenerationDateTime: string;
    bowserDriver: {
        handOverDate: string;
        name: string;
        id: string;
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
        [key: string]: any; // Adjust this if you have a specific type for load quantities
    };
    loadQuantityBySlip?: {
        [key: string]: any; // Adjust this if you have a specific type for load quantities
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
            [key: string]: any; // Adjust this if you have a specific type for odometer readings
        };
        bowserNewEndReading?: {
            [key: string]: any; // Adjust this if you have a specific type for end readings
        };
        settled: boolean;
    };
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