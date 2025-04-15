import mongoose from 'mongoose'

export interface Driver {
  Name: string
  ITPLId: string | null
  MobileNo?: Array<{
    MobileNo: string
    IsDefaultNumber: boolean
    LastUsed: boolean
  }>
}

// Define the BowserResponse interface
export interface BowserResponse {
  regNo: string
  bowserDriver: ResponseBowser
}

export interface ResponseBowser {
  bowser: any
  bowserDetails: {}
  tripSheetId: string
  regNo: string
  _id: string
  bowserDriver: Array<{
    id: string
    name: string
    phoneNo: string
  }>
}

export interface Level {
  levelNo: number
  levelHeight: number
  levelAdditionQty: number
  levelTotalQty?: number // Read-only after submission
  levelCalibrationQty?: number // Read-only after submission
}

export interface Chamber {
  chamberId: string
  levels: Level[]
}

export interface Bowser {
  _id: string
  regNo: string
  chambers: Chamber[]
  createdAt: Date
}

export interface PumpSlip {
  quantity: string
  slipPhoto: string
  bowserTankChamberID: string
}

export interface FuelRequest {
  createdAt: string
  _id: string
  vehicleNumber: string
  driverId: string
  driverName: string
  driverMobile: string
  location: string
  trip: string
  startDate: string
  manager: string
  tripStatus: string
  fulfilled: boolean
}

export interface LoadingOrder {
  _id: string
  createdAt: string
  regNo: string
  tripSheetId?: string
  loadingDesc?: string
  product: string
  loadingLocation: string
  loadingLocationName: string
  bccAuthorizedOfficer: {
    id: string
    name: string
  }
  fulfilled: boolean
}

export interface LoadingSheet {
  product: string
  _id: string;
  regNo: string;
  odoMeter: number;
  tempLoadByDip: number;
  totalLoadQuantityByDip: number;
  totalLoadQuantityBySlip: number;
  bccAuthorizedOfficer: {
    id: string;
    name: string;
    orderId: LoadingOrder;
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

export interface ChamberLevel {
  levelNo: number
  levelHeight: number
  levelAdditionQty: number
  levelTotalQty: number
  levelCalibrationQty: number
}

export interface OrderBowserResponse {
  order: LoadingOrder
  bowser: Bowser
}

export interface TripSheetPayload {
  bowser: {
    regNo: string;
    odometerStartReading?: number;
    driver: {
      handOverDate: Date;
      name: string;
      phoneNo: string;
    }[];
    pumpEndReading: number;
  };
  hsdRate?: number;
  fuelingAreaDestination?: string;
  proposedDepartureTime?: string;
  loading: {
    sheetId: string;
    quantityByDip: number;
    quantityBySlip: number;
    tempLoadByDip: number;
  };
}

export interface Trip {
  tripId: string
  settled: boolean
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
    sheetId: string;
    quantityByDip: number;
    quantityBySlip: number;
  };
  addition?: {
    sheetId: string;
    quantityByDip: number;
    quantityBySlip: number;
  }[];
  dispenses: {
    transaction: string;
    fuelQuantity: number;
    verified?: {
      status: boolean;
      by?: {
        id: string;
        name: string;
      };
    }
    isPosted: boolean;
  }[];
  totalLoadQuantity?: number;
  loadQty?: number;
  totalAdditionQty?: number;
  totalAdditionQtyBySlip?: number;
  totalLoadQuantityBySlip?: number;
  saleQty?: number;
  balanceQty?: number;
  balanceQtyBySlip?: number;
  tempLoadByDip?: number;
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

export interface WholeTripSheet {
  hsdRate: number;
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
    quantity: number
    at: string | Date
    sheetId: LoadingSheet;
    quantityByDip: number;
    quantityBySlip: number;
  }[];
  dispenses: DispensesRecord[];
  totalLoadQuantity?: number;
  loadQty?: number;
  totalAdditionQty?: number;
  totalAdditionQtyBySlip?: number;
  totalLoadQuantityBySlip?: number;
  saleQty?: number;
  balanceQty?: number;
  balanceQtyBySlip?: number;
  tempLoadByDip?: number;
  settelment?: {
    dateTime: Date;
    details: {
      odometer: number;
      pumpReading: number;
      chamberwiseDipList: {
        chamberId: string;
        levelHeight: number;
        qty: number;
      }[];
      totalQty: number;
      extras: Extras;
    };
    settled: boolean;
  };
  posted?: boolean;
}

export interface Extras {
  filledByDriver: number
  saleryTotal: number
  foodingTotal: number
  rewardTotal: number
  hsdRateFor: number
  tollTax: number
  borderOtherExp: number
  unload: number
  hsdPerKm: number
}

export interface User {
  _id: mongoose.Schema.Types.ObjectId
  userId: string
  phoneNumber: string
  phoneNo?: string
  name: string
  department: string
  bowserId: string
  verified: boolean
  roles: string[]
  generationTime: Date
}

export interface MainUser {
  _id: string
  userId: string
  department: Department
  phoneNumber: string
  phoneNo?: string
  name: string
  bowserId: string
  verified: boolean
  roles: Role[]
  generationTime: Date
}

export interface Role {
  _id: string
  id: string
  name: string
  notes: string
  permissions: {
    apps: { name: string; access: 'read' | 'write' | 'admin' | null }[]
    functions: { name: string; allowed: boolean }[]
    customPermissions: Record<string, any>
  }
}

export interface Department {
  id: string
  _id: string
  name: string
}

export interface UnauthorizedLogin {
  _id: string
  userId: string
  name: string
  phoneNumber: string
  registeredDeviceUUID: string
  attemptedDeviceUUID: string
  timestamp: Date
}

export interface Vehicle {
  _id: string
  VehicleNo: string
  tripDetails: {
    driver: {
      id: string
      Name: string
    } | string
    open: boolean
  }
  GoodsCategory: string
  manager: string
}

export interface VehicleWithTrip {
  VehicleNo: string
  tripDetails: {
    driver: {
      id: string
      name: string
      mobile: string
    }
    open: boolean
    from: string
    to: string
    startedOn: string
  }
  GoodsCategory: string
}
export interface AttachedVehicle {
  VehicleNo: string
  TransportPartenName: string
}

export interface TripDriver {
  name: string
  id: string | null
  mobile?: string
}

export interface DispensesRecord {
  _id: string;
  orderId: string;
  category: string;
  party: string;
  tripSheetId: string;
  vehicleNumberPlateImage: string;
  vehicleNumber: string;
  odometer: string;
  driverName: string;
  driverId: string;
  driverMobile: string;
  fuelMeterImage: string[];
  slipImage?: string;
  fuelQuantity: string;
  quantityType: string;
  gpsLocation: string;
  location: string;
  fuelingDateTime: string;
  verified: {
    status: boolean;
    by?: {
      id: string;
      name: string;
    };
  };
  posted?: {
    status: boolean;
    by: {
      id: string;
      name: string;
    }
  };
  bowser: {
    regNo: string;
    driver: {
      name: string;
      id: string;
      phoneNo: string;
    };
  };
  allocationAdmin: {
    name: string;
    id: string;
  };
  cost?: number
}

export interface XMLVariables {
  entryVoucher: string;
  entryStock: string;
  entryGodown: string;
  entryBatch: string;
  creditEntryTo: string;
  HSDRate: number | undefined;
}

export interface Filters {
  driverName: string
  bowserRegNo: string
  tripSheetId: string
  unsettled: boolean
}

export interface Sort {
  field: string
  order: 'asc' | 'desc'
}

export interface FuelingOrder {
  _id: string
  vehicleNumber: string
  category: string
  party: string
  driverId: string
  driverName: string
  driverMobile: string
  quantityType: 'Full' | 'Part'
  fuelQuantity: number
  bowser: {
    regNo: string
    driver: {
      name: string
      phoneNo: string
    }
  }
  allocationAdmin: {
    name: string
    id: string
  }
  fulfilled: boolean
  createdAt: Date
}

export type FuelingTypes = 'Own' | 'Attatch' | 'Bulk Sale'
