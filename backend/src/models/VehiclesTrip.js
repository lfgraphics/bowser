const mongoose = require('mongoose');
const TransAppUser = require('./TransUser');
const { transportDatabaseConnection } = require('../../config/database');

const tankerTripSchema = new mongoose.Schema({
    VehicleNo: { type: String, required: true },
    StartDate: { type: Date },
    targetTime: { type: Date },
    StartFrom: { type: String },
    EndTo: { type: String },
    LoadStatus: { type: Number },
    LoadTripDetail: {
        LoadDate: { type: Date },
        ReportDate: { type: Date },
        UnloadDate: { type: Date },
        StartOdometer: { type: Number },
        EndOdometer: { type: Number },
        SupplyFrom: { type: String },
        SupplyTo: { type: String },
        NameOfGoods: { type: String },
        LoadDetail: {
            LoadQty: { type: Number },
            UnloadQty: { type: Number },
            ShortQty: { type: Number },
            DeductionComment: { type: String },
        }
    },
    EmptyTripDetail: {
        VehicleNo: { type: String },
        ProposedDestination: { type: String },
        ProposedDate: { type: Date },
        ReportDate: { type: Date },
        EndDate: { type: Date },
        StartOdometer: { type: Number },
        EndOdometer: { type: Number },
        PreviousTripId: { type: mongoose.Types.ObjectId, ref: 'TankersTrip' },
        PreviousTripIdNew: { type: String },
        ProposedBy: { type: String },
        OrderedBy: { type: String },
        Division: { type: Number },
    },
    TravelHistory: [
        new mongoose.Schema({
            TrackUpdateDate: { type: Date },
            LocationOnTrackUpdate: { type: String },
            OdometerOnTrackUpdate: { type: Number },
            ManagerComment: { type: String },
            Driver: { type: String },
        }, { _id: false })
    ],
    TallyLoadDetail: {
        BillingPartyName: { type: String },
        BillingRoute: { type: String },
        BooksOf: { type: String },
        Consignee: { type: String },
        Consignor: { type: String },
        DieselRoute: { type: String },
        DriverLicenseNo: { type: String },
        DriverLicenseValidityDate: { type: String },
        DriverName: { type: String },
        EndOdometer: { type: Number },
        FinancialyClose: { type: Number },
        FinancialyCloseDate: { type: String },
        Goods: { type: String },
        GRNo: { type: String },
        GUID: { type: String },
        KMbyDieseRoute: { type: Number },
        KMbyRoute: { type: Number },
        LoadingDate: { type: Date },
        LoadingQty: { type: Number },
        MasterId: { type: Number },
        OperationalyClose: { type: Number },
        PartyLedger: { type: String },
        PersistedView: { type: String },
        ReportedDate: { type: Date },
        ShortageQty: { type: Number },
        StartOdometer: { type: Number },
        SyncDateTime: { type: Date },
        TripId: { type: String },
        UnloadingDate: { type: Date },
        UnloadingQty: { type: Number },
        UnloadingTime: { type: Number },
        VehicleMode: { type: String },
        VoucherDate: { type: Date },
        VoucherKey: { type: Number },
        VoucherNo: { type: String },
        VoucherType: { type: String }
    },
    StartDriver: { type: String },
    StartDriverMobile: { type: String },
    OpretionallyModified: { type: Boolean },
    ReportingDate: { type: Date },
    EndDate: { type: Date },
    LastSyncDate: { type: Date },
    statusUpdate: [
        {
            dateTime: { type: Date, required: true },
            user: {
                _id: { type: mongoose.Types.ObjectId, ref: 'TransAppUser' },
                name: String
            },
            status: {
                type: String,
                enum: ["In Distelary", "Accident", "Returning", 'Head Quarter'],
                required: true
            },
            comment: { type: String, required: false }
        }
    ]
}, { versionKey: false });

module.exports = transportDatabaseConnection.model('TankersTrip', tankerTripSchema, 'TankersTrips');
