import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const customerSchema = new Schema({
    IsMainParty: { type: String, enum: ["Yes", "No"], default: "Yes" },
    Name: String,
    CompanyTag: String,
    MailingName: String,
    CommanLedger: { type: Schema.Types.ObjectId, ref: 'Customer' },
    CustGroup: { type: Schema.Types.ObjectId, ref: 'CustomerGroup' },
    Address: String,
    Pincode: String,
    Country: String,
    State: String,
    Location: String,
    ContactPerson: String,
    MobileNo: String,
    LandLineNo: String,
    EMailID: String,
    PanNo: {
        type: String,
        uppercase: true,
        trim: true,
        match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN number'],
    },
    RegtType: String,
    GSTIN: {
        type: String,
        uppercase: true,
        trim: true,
        match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please provide a valid GSTIN number'],
    },
    IsActiveCustomer: { type: String, enum: ["Yes", "No"], default: "Yes" },
    IsBillingParty: { type: String, enum: ["Yes", "No"], default: "No" },
    IsAttachedOwner: { type: String, enum: ["Yes", "No"], default: "No" },
    IsConsiGnor: { type: String, enum: ["Yes", "No"], default: "No" },
    IsConsignee: { type: String, enum: ["Yes", "No"], default: "No" },
    ROuteDetention: [
        {
            Route: String,
            Detention: [
                {
                    Product: String,
                    DetMethod: String,
                    Charges: String,
                    DetDays: String
                }
            ]
        },
    ],
    "Product Wise": [
        {
            PRProdcutName: String,
            BilQty: String,
            TollTax: String,
            BillDateRange: String,
            FreightCalc: String
        }
    ]
});

customerSchema.index({ CustomerName: 1 });
customerSchema.index({ Address: 1 });
customerSchema.index({ IsActiveCustomer: 1 });
customerSchema.index({ 'ROuteDetention.Route': 1 });
customerSchema.index({ 'Product Wise.PRProdcutName': 1 });

const Customer = getTransportDatabaseConnection().model('Customer', customerSchema, 'CustomersCollection');

// Export model methods as named exports
export const find = Customer.find.bind(Customer);
export const findOne = Customer.findOne.bind(Customer);
export const findById = Customer.findById.bind(Customer);
export const findOneAndUpdate = Customer.findOneAndUpdate.bind(Customer);
export const findByIdAndUpdate = Customer.findByIdAndUpdate.bind(Customer);
export const updateOne = Customer.updateOne.bind(Customer);
export const updateMany = Customer.updateMany.bind(Customer);
export const deleteOne = Customer.deleteOne.bind(Customer);
export const deleteMany = Customer.deleteMany.bind(Customer);
export const create = Customer.create.bind(Customer);
export const insertMany = Customer.insertMany.bind(Customer);
export const countDocuments = Customer.countDocuments.bind(Customer);
export const distinct = Customer.distinct.bind(Customer);
export const aggregate = Customer.aggregate.bind(Customer);
export const bulkWrite = Customer.bulkWrite.bind(Customer);

export default Customer;