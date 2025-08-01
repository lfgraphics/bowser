export interface Driver {
  Name: string
  ITPLId: string | null
  MobileNo?: Array<{
    MobileNo: string
    IsDefaultNumber: boolean
    LastUsed: boolean
  }>
}

export type FuelingTypes = 'Own' | 'Attatch' | 'Bulk Sale'
export type AuthNav = 'bowserDriver' | 'vehicleDriver'

export interface Vehicle {
  VehicleNo: string
  tripDetails: TripDetails
}

export interface VehicleDriver {
  id: string
  Name: string
  MobileNo: string
}

export interface Pump {
  name: string;
  state: string;
}

export interface TripDetails {
  id: string;
  driver: VehicleDriver;
  open: boolean;
}

export interface LoadingSheet {
  _id: string;
  regNo: string;
  odoMeter: number;
  totalLoadQuantityByDip: number;
  totalLoadQuantityBySlip: number;
  bccAuthorizedOfficer: {
    id: string;
    name: string;
    orderId: string;
  };
  chamberwiseDipListAfter: {
    chamberId: string;
    levelHeight: number;
    qty: number;
  }[];
  chamberwiseDipListBefore: {
    chamberId: string;
    levelHeight: number;
    qty: number;
  }[];
  chamberwiseSealList: {
    chamberId: string;
    sealId: string;
    sealPhoto: string;
  }[];
  createdAt: string;
  fuleingMachine: string;
  fulfilled: boolean;
  loadingIncharge: {
    id: string;
    name: string;
  };
  pumpReadingAfter: number;
  pumpReadingBefore: number;
  pumpSlips: {
    chamberId: string;
    qty: number;
    slipPhoto: string;
  }[];
}
export interface TripSheet {
  _id?: string;
  tripSheetId: number;
  createdAt: Date;
  tripSheetGenerationDateTime?: Date;
  bowser: {
    regNo: string;
    driver: {
      handOverDate: Date;
      name: string;
      phoneNo: string;
    }[];
  };
  fuelingAreaDestination?: string;
  proposedDepartureTime?: string;
  loading: {
    sheetId: LoadingSheet;
    quantityByDip: number;
    quantityBySlip: number;
  };
  addition?: {
    sheetId: LoadingSheet;
    quantityByDip: number;
    quantityBySlip: number;
  }[];
  dispenses: {
    transaction: string;
    fuelQuantity: number;
    isVerified: boolean;
    isPosted: boolean;
  }[];
  totalLoadQuantity?: number;
  saleQty?: number;
  balanceQty?: number;
  balanceQtyBySlip?: number;
  settelment?: {
    dateTime: Date;
    details: {
      pumpReading: string;
      chamberwiseDipList: {
        chamberId: string;
        levelHeight: number;
        qty: number;
      }[];
      totalQty: number;
    };
    settled: boolean;
  };
  posted?: boolean;
}
export type BowserDriver = {
  id: string;
  name: string;
};

export type FuelingOrderData = {
  _id: string;
  bowserDriver: BowserDriver;
  driverId: string;
  party: string;
  category: FuelingTypes;
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
    };
  };
  allocationAdmin?: {
    name: string;
    id: string;
    allocationTime: string;
  };
  request?: FuelRequest;
  createdAt?: string;
};

export interface FuelNotificationProps {
  category: FuelingTypes;
  party: string;
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
  };
  createdAt: string
  request: FuelRequest
}

export interface FuelRequest {
  petrolPump: string
  pumpAllocationType: string
  fuelProvider: string;
  fuelQuantity: number
  quantityType: string
  bowser: any
  allocationType: string
  _id: string;
  vehicleNumber: string;
  driverName: string;
  driverId: string;
  driverMobile: string;
  location: string;
  fulfilled: boolean;
  createdAt: string;
  allocation: string | {
    bowser: {
      driver: {
        name: string;
        phoneNo: string;
      },
      regNo: string;
    },
    allocationAdmin: {
      name: string;
      id: string;
    },
    category: string;
    tripId: string;
    party: string;
    quantityType: string;
    fuelQuantity: number;
    fulfilled: boolean;
    createdAt: string;
    allocationType: string;
    pumpAllocationType: string;
    fuelProvider: string;
    pumpLocation: string;
  }
}

export interface AppUpdates {
  _id: string;
  buildVersion: number;
  url: string;
  pushDate: Date;
}

export interface FormData {
  tripId?:string;
  category: FuelingTypes;
  party: string;
  odometer: Number | null;
  orderId?: string;
  vehicleNumberPlateImage: string | null;
  tripSheetId: number;
  vehicleNumber: string;
  driverName: string;
  driverId: string;
  driverMobile: string;
  fuelMeterImage: string[] | null;
  fuelQuantity: string;
  quantityType: "Full" | "Part" | "N/A";
  gpsLocation: string;
  location: string;
  fuelingDateTime: Date;
  bowser: {
    regNo: string;
    driver: {
      name: string;
      phoneNo: string;
    };
  };
  allocationAdmin?: {
    name: string;
    id: string;
  };
}
export interface UserData {
  _id: string
  userId: string
  name: string
  phoneNumber: string
  verified: boolean
  roles: string[]
}
export interface DriverData {
  Name: string
  Id: string
  'Phone Number': string
  Role: string,
  VehicleNo: string
}
