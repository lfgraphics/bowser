import mongoose from 'mongoose'

export interface Driver {
  _id: string
  Name: string
  ITPLId: string | null
  MobileNo?: Array<{
    MobileNo: string
    IsDefaultNumber: boolean
    LastUsed: boolean
  }>
  password: string
  generationTime: string
  verified: boolean
  keypad: boolean
  isRegistered: boolean
}

export interface SignUpRequests {
  _id: string;
  phoneNumber: string;
  vehicleNo: string;
  deviceUUID: string;
  pushToken: string;
  generationTime: string;
}

export interface TransferRequest {
  _id: string
  by: string
  to: string
  transferReason: string
  accepted: boolean
  fulfilled: boolean
  cancellation: {
    by: string
    reason: string
    time: string
  },
  generationTime: string
}

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
  createdAt: string
  currentTrip: TripSheet | string
}

export interface PumpSlip {
  quantity: string
  slipPhoto: string
  bowserTankChamberID: string
}

export interface FuelRequest {
  loadStatus: string
  capacity: string
  createdAt: string
  _id: string
  vehicleNumber: string
  odometer: string
  driverId: string
  driverName: string
  driverMobile: string
  location: string
  trip: string
  startDate: string
  manager: string
  tripStatus: string
  seen: boolean
  fulfilled: boolean
  tripId: string
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
  changeInOpeningDip: {
    reason: string;
    remarks: string;
  },
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
    sheetId: LoadingSheet | string;
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
    posted: boolean;
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
  closure: {
    dateTime: Date | string;
    details: {
      reason: string;
      remarks: string;
    };
  }
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
    id: string
    driver: {
      id: string
      Name: string
    } | string
    open: boolean
    from: string
    to: string
    startedOn: string
    loadStatus: string
  }
  operationManager: string
  capacity: string
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

export interface InactiveVehicles {
  UserInfo: {
    Created: string,
    CreatedBy: string,
    Modified: string,
    ModifiedBy: string,
  }
  VehicleNo: string,
  _id: string
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
  petrolPump: string
  pumpAllocationType: string
  partyName: string
  _id: string
  allocationType: "bowser" | "external" | "internal"
  odometer: string
  tripId: string
  fuelProvider: string
  pumpLocation: string
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
  seen: boolean
  fulfilled: boolean
  createdAt: Date
}

export interface BowserTrips {
  _id: string;
  bowser: {
    regNo: string;
    driver: Array<{
      handOverDate: string; // ISO date string
      name: string;
      phoneNo: string;
    }>;
  };
  hsdRate: number;
  fuelingAreaDestination: string;
  proposedDepartureTime: string; // ISO date string
  loading: {
    sheetId: {
      _id: string;
      regNo: string;
      odoMeter: number;
      fuleingMachine: string;
      pumpReadingBefore: number;
      pumpReadingAfter: number;
      chamberwiseDipListBefore: Array<{
        chamberId: string;
        levelHeight: number;
        qty: number;
      }>;
      chamberwiseDipListAfter: Array<{
        chamberId: string;
        levelHeight: number;
        qty: number;
      }>;
      changeInOpeningDip: {
        reason: string;
        remarks: string;
      },
      totalLoadQuantityBySlip: number;
      totalLoadQuantityByDip: number;
      tempLoadByDip: number;
      loadingIncharge: {
        id: string;
        name: string;
      };
      bccAuthorizedOfficer: {
        orderId: string;
        id: string;
        name: string;
      };
      fulfilled: boolean;
      createdAt: string; // ISO date string
      __v: number;
    };
    quantityByDip: number;
    quantityBySlip: number;
  };
  posted: boolean;
  createdAt: string; // ISO date string
  addition: any[];   // adjust `any` if you know the shape
  tripSheetId: number;
  loadQty: number;
  totalAdditionQty: number;
  totalLoadQuantityBySlip: number;
  totalLoadQuantity: number;
  saleQty: number;
  balanceQty: number;
  balanceQtyBySlip: number;
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
  closure: {
    dateTime: Date | string;
    details: {
      reason: string;
      remarks: string;
    };
  }
  __v: number;
}

export type FuelingTypes = 'Own' | 'Attatch' | 'Bulk Sale'

export interface TransAppUser {
  _id: string,
  name: string,
  phoneNumber: string,
  hashed: boolean,
  userId: string,
  Photo: {
    type: string,
    data: [number]
  },
  Division: string,
  vehicles: [string]
}

export interface TankersTrip {
  _id: string;
  TallyLoadDetail: {
    LockNo: string;
    BillingPartyName: string;
    BillingRoute: string;
    BooksOf: string;
    Consignee: string;
    Consignor: string;
    DieselRoute: string;
    DriverLicenseNo: string;
    DriverLicenseValidityDate: string;
    DriverName: string;
    EndOdometer: number;
    FinancialyClose: number;
    FinancialyCloseDate: string;
    Goods: string;
    GRNo: string;
    GUID: string;
    KMbyDieseRoute: number;
    KMbyRoute: number;
    LoadingDate: string;
    LoadingQty: number;
    MasterId: number;
    OperationalyClose: number;
    PartyLedger: string;
    PersistedView: string;
    ReportedDate: string;
    ShortageQty: number;
    StartOdometer: number;
    SyncDateTime: string;
    TripId: string;
    UnloadingDate: string;
    UnloadingQty: number;
    UnloadingTime: number;
    VehicleMode: string;
    VehicleNo: string;
    VoucherDate: string;
    VoucherKey: number;
    VoucherNo: string;
    VoucherType: string;
  };
  EmptyTripDetail: {
    LockNo: string;
    VehicleNo: string;
    ProposedDate: string;
    ProposedDestination: string;
    ReportDate: string;
    EndDate: string;
    StartOdometer: number;
    EndOdometer: number;
    PreviousTripId: string;
    PreviousTripIdNew: string;
    Division: number;
  },
  EndTo: string;
  LoadStatus: number;
  StartDate: string;
  ReportingDate: string;
  targetTime: string;
  StartDriver: string;
  StartDriverMobile: string;
  StartFrom: string;
  LoadTripDetail: {
    LoadDate: string;
    SupplyFrom: string;
    ShipTo: string;
    NameOfGoods: string;
    LoadDetail: {
      LoadQty: number;
      UnloadQty: number;
      ShortQty: number;
    };
    UnloadDate: string | Date | null;
    EndOdometer: number | null;
    ReportDate: string | Date | null
  };
  TravelHistory: {
    TrackUpdateDate: Date;
    LocationOnTrackUpdate: string;
    OdometerOnTrackUpdate: number;
    ManagerComment: string;
    Driver: string;
  }[];
  VehicleNo: string;
  capacity: string;
  superwiser?: string;
  loadingSupervisor?: string;
  statusUpdate: {
    dateTime: string;
    user: {
      _id: string;
      name: string
    },
    status: TripStatusUpdateEnums;
    comment?: string
  }[];
  OpretionallyModified?: boolean;
}

export interface StackHolder {
  _id: string;
  InstitutionName: string;
  IsBillingParty: boolean;
  IsConsignee: boolean;
  IsConsigner: boolean;
  Location: string;
  shortName: string;
  loadingSupervisor: string;
}

export interface TripsSummary {
  empty: {
    onWay: {
      count: number,
      trips: TankersTrip[]
    },
    reported: {
      count: number,
      trips: TankersTrip[]
    },
    standing: {
      count: number,
      trips: TankersTrip[]
    }
  },
  loaded: {
    onWay: {
      count: number,
      trips: TankersTrip[]
    },
    reported: {
      count: number,
      trips: TankersTrip[]
    },
  }
}

export type TripStatusUpdateEnums = "In Distillery" | "Accident" | "Returning" | 'Head Quarter' | 'Custom' | 'Breakdown'
export const tripStatusUpdateVars = ["In Distillery", "Accident", "Returning", 'Head Quarter', 'Custom', 'Breakdown']
