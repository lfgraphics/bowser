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
    bowserDriver: {
        _id: mongoose.Schema.Types.ObjectId,
        userName: String,
        userId: String
    },
    allocationAdmin: {
        _id: { type: mongoose.Schema.Types.ObjectId, required: false },
        userName: { type: String, required: false },
        userId: { type: String, required: false }
    },
}