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
        userId: string;
        name: string;
    };
}

// console.log(bowserResponse.bowserDetails[0].bowserDriver.userId);

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
    vehicleNumberPlateImage: string,
    vehicleNumber: string,
    driverName: String,
    driverId: String,
    driverMobile: String,
    fuelMeterImage: string,
    slipImage: string,
    fuelQuantity: String,
    quantityType: String,
    gpsLocation: String,
    fuelingDateTime: String,
    verified: boolean,
    bowser: {
        regNo: string,
        driver: {
            name: String,
            id: String
            phoneNo: String
        }
    },
    allocationAdmin: {
        name: { type: String, required: false },
        userId: { type: String, required: false }
    },
}