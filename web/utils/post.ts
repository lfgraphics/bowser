"use server"
import path from 'path';
import fs from 'fs/promises';
import { DispensesRecord, XMLVariables } from "@/types"
import { getDateInTallyFormate, getTimeInTallyFormate } from './tally';

export const createTallyPostableXML = async (record: DispensesRecord, variables: XMLVariables) => {
    const filePath = path.join(process.cwd(), 'app', 'api', 'generate-xml', 'Voucher.xml');
    
    let xml = await fs.readFile(filePath, 'utf-8');

    xml = xml.replace(/entryDate/g, getDateInTallyFormate(Date()))
        .replace(/debitBy/g, record.category === "Own" ? "Blended Bio-Diesel Consume" : record.party)
        .replace(/entryVoucher/g, variables.entryVoucher)
        .replace(/voucherNumber/g, record._id)
        .replace(/totalCost/g, String(record.cost?.toFixed(2)))
        .replace(/creditEntryTo/g, variables.creditEntryTo)
        .replace(/entryStock/g, variables.entryStock)
        .replace(/HSDRate/g, String(variables.HSDRate))
        .replace(/quantity/g, String(Number(record.fuelQuantity).toFixed(3)))
        .replace(/entryGodown/g, record.bowser.driver.name === "Gida Office" ? variables.entryGodown : `${record.bowser.regNo} (Bowser)`)
        .replace(/entryBatch/g, record.bowser.driver.name === "Gida Office" ? variables.entryBatch : record.tripSheetId)
        .replace(/odometer/g, record.odometer)
        .replace(/udfQty/g, record.fuelQuantity)
        .replace(/udfRate/g, String(variables.HSDRate))
        .replace(/udfAmount/g, String(record.cost))
        .replace(/fuelingDate/g, getDateInTallyFormate(record.fuelingDateTime))
        .replace(/vehicleNo/g, record.vehicleNumber)
        .replace(/driver/g, record.driverId && record.driverId !== 'NA' ? `${record.driverName}-${record.driverId}` : record.driverName)
        .replace(/qtyType/g, record.quantityType)
        .replace(/fuelingLocation/g, record.location)
        .replace(/fuelingTime/g, getTimeInTallyFormate(record.fuelingDateTime))
        .replace(/fullFuelingDateTime/g, `${getDateInTallyFormate(record.fuelingDateTime)}${getTimeInTallyFormate(record.fuelingDateTime)}`)

    return xml
}
