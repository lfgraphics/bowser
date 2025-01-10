"use client"
import React, { useState } from 'react'
import './styles.css'
import { Table, TableRow, TableBody, TableCell, } from '@/components/ui/table';
import { WholeTripSheet } from '@/types';
import Image from 'next/image';
// import './TripCalculationModal.css';

interface TripCalculationModalProps {
    record: WholeTripSheet; // Trip sheet details
}

const FinalPrint: React.FC<TripCalculationModalProps> = ({ record }) => {
    const [bowser, setBowser] = useState<string>(record?.bowser.regNo)
    //chamber 1
    const [ch1Cm, setCh1Cm] = useState<number>(record?.settelment?.details?.chamberwiseDipList.find(chamber => chamber.chamberId === "Chamber-1")?.levelHeight || 0)
    const [ch1qty, setCh1qty] = useState<number>(Number(record?.settelment?.details?.chamberwiseDipList.find(chamber => chamber.chamberId === "Chamber-1")?.qty.toFixed(2)) || 0)
    const [ch1OpeningCm, setCh1OpeningCm] = useState<number>(record?.loading.sheetId?.chamberwiseDipListBefore.find(chamber => chamber.chamberId === "Chamber-1")?.levelHeight || 0)
    const [ch1Openingqty, setCh1Openingqty] = useState<number>(Number(record?.loading.sheetId?.chamberwiseDipListBefore.find(chamber => chamber.chamberId === "Chamber-1")?.qty.toFixed(2)))
    const [ch1QtyToBeReturn, setCh1QtyToBeReturn] = useState<number>(Number(ch1qty !== null && ch1qty !== undefined ? (ch1qty - ch1Openingqty).toFixed(2) : 0))
    const [ch1FullLoadAddCm, setCh1FullLoadAddCm] = useState<number>(record?.loading.sheetId.chamberwiseDipListAfter.find(chamber => chamber.chamberId === "Chamber-1")?.levelHeight || 0)
    const [ch1FullLoadAddqty, setCh1FullLoadAddqty] = useState<number>(Number((record?.loading.quantityBySlip / 2).toFixed(2)))
    const [ch1FullLoadTotalqty, setCh1FullLoadTotalqty] = useState<number>(ch1FullLoadAddqty + ch1Openingqty)
    const [ch1FullLoadDipqty, setCh1FullLoadDipqty] = useState<string>(record?.loading.sheetId.chamberwiseDipListAfter[0].qty.toFixed(2))
    //chamber 2
    const [ch2Cm, setCh2Cm] = useState<number>(record?.settelment?.details?.chamberwiseDipList.find(chamber => chamber.chamberId === "Chamber-2")?.levelHeight || 0)
    const [ch2qty, setCh2qty] = useState<number>(Number(record?.settelment?.details?.chamberwiseDipList.find(chamber => chamber.chamberId === "Chamber-2")?.qty.toFixed(2)) || 0)
    const [ch2OpeningCm, setCh2OpeningCm] = useState<number>(record?.loading.sheetId?.chamberwiseDipListBefore.find(chamber => chamber.chamberId === "Chamber-2")?.levelHeight || 0)
    const [ch2Openingqty, setCh2Openingqty] = useState<number>(Number(record?.loading.sheetId?.chamberwiseDipListBefore.find(chamber => chamber.chamberId === "Chamber-2")?.qty.toFixed(2)))
    const [ch2QtyToBeReturn, setCh2QtyToBeReturn] = useState<number>(Number(ch2qty !== null && ch2qty !== undefined ? (ch2qty - ch2Openingqty).toFixed(2) : 0))
    const [ch2FullLoadAddCm, setCh2FullLoadAddCm] = useState<number>(record?.loading.sheetId.chamberwiseDipListAfter.find(chamber => chamber.chamberId === "Chamber-2")?.levelHeight || 0)
    const [ch2FullLoadAddqty, setCh2FullLoadAddqty] = useState<number>(Number((record?.loading.quantityBySlip / 2).toFixed(2)))
    const [ch2FullLoadTotalqty, setCh2FullLoadTotalqty] = useState<number>(ch2FullLoadAddqty + ch2Openingqty)
    const [ch2FullLoadTotalqtyByDip, setCh2FullLoadTotalqtyByDip] = useState<number>(record?.loading.sheetId.chamberwiseDipListAfter.find(chamber => chamber.chamberId === "Chamber-2")?.qty || 0)
    //total
    const [totalClosingCm, setTotalClosingCm] = useState<number>(ch1Cm + ch2Cm)
    const [totalClosingQty, setTotalClosingQty] = useState<number>(ch1qty + ch2qty)
    const [totalOpeningCm, setTotalOpeningCm] = useState<number>(Number((ch1OpeningCm + ch2OpeningCm).toFixed(2)))
    const [totalOpeningQty, setTotalOpeningQty] = useState<number>(Number((ch1Openingqty + ch2Openingqty).toFixed(2)))
    const [totalQtyToBeReturned, setTotalQtyToBeReturned] = useState<number>(Number((ch1QtyToBeReturn + ch2QtyToBeReturn).toFixed(2)))
    const [totalLoadHeight, setTotalLoadHeight] = useState<number>(ch1FullLoadAddCm + ch2FullLoadAddCm)
    const [totalLoadQty, setTotalLoadQty] = useState<number>(record?.totalLoadQuantityBySlip || 0)
    const [totalLoadedQty, setTotalLoadedQty] = useState<number>(record?.totalLoadQuantityBySlip || 0)
    const [totalLoadedQtyByDip, setTotalLoadedQtyByDip] = useState<number>(Number(record?.totalLoadQuantity?.toFixed(2)) || 0)
    // heading and slip total on load
    const [fullLoadQtyBySlip, setFullLoadQtyBySlip] = useState<number>(Number(record?.loading.quantityBySlip.toFixed(2)) || 0)
    // pump reading, Odo meter and addition
    // while opeing (trip hseet creation) (from loading sheet)
    const [openingPumpReading, setOpeningPumpReading] = useState<number>(record?.loading.sheetId.pumpReadingAfter)
    const [openingOdoMeter, setOpeningOdometer] = useState<number>(record?.loading.sheetId.odoMeter)
    const [addition, setAddition] = useState<number>(record?.totalAdditionQtyBySlip || 0)
    // while closing (settlment)
    const [closingPumpReading, setclosingPumpReading] = useState<number>(record?.settelment?.details.pumpReading || 0)
    const [closingOdoMeter, setclosingOdometer] = useState<number>(record?.settelment?.details.odometer || 0)
    const [unload, setUnLoad] = useState<number>(record.settelment?.details.extras?.unload || 0)
    //calculations
    const [machineSaleQty, setMachineSaleQty] = useState<number>(closingPumpReading - openingPumpReading)
    const [distance, setDistance] = useState<number>(closingOdoMeter - openingOdoMeter)
    const [netLoadQty, setNetLoadQty] = useState<number>((Number(record?.totalLoadQuantityBySlip?.toFixed(2)) || 0) - unload)
    // HSD consumption, short excess
    const [hsdPerKm, setHsdPerKm] = useState<number>(Number((record.settelment?.details.extras?.hsdPerKm || 0).toFixed(2)))
    const [hsdConsumption, setHsdConsumption] = useState<number>(distance > 0 && hsdPerKm > 0 ? Math.round(distance / hsdPerKm) : 0)
    const [shortExcess, setShortExcess] = useState<number>(totalClosingQty - totalOpeningQty)
    //pump consumtion & sale as per load
    const [pumpConsumption, setPumpConsumption] = useState<number>(machineSaleQty > 0 ? Math.round(1 * machineSaleQty / 1000) : 0)
    const [saleAsPerLoad, setSaleAsPerLoad] = useState<number>(netLoadQty - shortExcess)
    // filled by driver, sale as per driver
    const [filledByDriver, setFilledByDriver] = useState<number>(record.settelment?.details.extras?.filledByDriver || 0)
    const [saleAsPerDriver, setSaleAsPerDriver] = useState<number>(Number((record?.saleQty || 0).toFixed(2)))
    // short/excess & excess/short(sale)
    const [shortOrExcessByDriver, setShortOrExcessByDriver] = useState<number>((hsdConsumption + pumpConsumption) - (filledByDriver || 0))
    const [shortOrExcessAsPerRecord, setShortOrExcessAsPerRecord] = useState<number>(saleAsPerDriver - saleAsPerLoad)

    const [saleryDays, setSaleryDays] = useState<number>(record.settelment?.details.extras?.saleryDays || 0)
    const [foodingDays, setFoodingDays] = useState<number>(record.settelment?.details.extras?.foodingDays || 0)

    const [hsdRateFor, setHsdRateFor] = useState<number>(record.settelment?.details.extras?.hsdRateFor || 0)
    const [tollTax, setTollTax] = useState<number>(record.settelment?.details.extras?.tollTax || 0)
    const [driverFooding, setDriverFooding] = useState<number>(foodingDays * 200)
    const [driverSalary, setDriverSalary] = useState<number>(saleryDays * 500)
    const [fuelingCost, setFuelingCost] = useState<number>(Math.round((hsdRateFor) * filledByDriver))
    const [borderOtherExp, setBorderOtherExp] = useState<number>(record.settelment?.details.extras?.borderOtherExp || 0)
    const [reward, setReward] = useState<number>((record.settelment?.details.extras?.rewardTrips || 0) * 300)

    // deduction and distribution cost


    const [deductableExcessFuelingValue, setDeductableExcessFuelingValue] = useState<number>(((shortOrExcessByDriver < -(hsdConsumption * 0.05).toFixed(2)) ? shortOrExcessByDriver : 0) * hsdRateFor)
    const [deductableShortSale, setDeductableShortSale] = useState<number>(((shortOrExcessAsPerRecord < -5) ? shortOrExcessAsPerRecord : 0 * hsdRateFor))
    const [totalDeduction, setTotalDeduction] = useState<number>(deductableExcessFuelingValue + deductableShortSale)
    const [totalDistributionCost, setTotalDistributionCost] = useState<number>(tollTax + driverFooding + driverSalary + fuelingCost + borderOtherExp)
    const [distributionCostPerLtr, setDistributionCostPerLtr] = useState<number>(Number((totalDistributionCost / saleAsPerLoad).toFixed(2)))

    return (
        <div className=''>
            <div id="printable-table">
                <Table >
                    <TableBody>
                        <TableRow className='font-semibold'>
                            <TableCell>Vehicle No.</TableCell>
                            <TableCell colSpan={2}>{bowser}</TableCell>
                            <TableCell className='text-center' colSpan={2}>Opening</TableCell>
                            <TableCell className='text-center' rowSpan={2}>Qty to be Return</TableCell>
                            <TableCell className='text-center' colSpan={4}>Full Load</TableCell>
                        </TableRow>
                        <TableRow className='font-semibold'>
                            <TableCell>Chamber</TableCell>
                            <TableCell>CM</TableCell>
                            <TableCell>QTY</TableCell>
                            <TableCell>CM</TableCell>
                            <TableCell>QTY</TableCell>
                            <TableCell>CM</TableCell>
                            <TableCell>Add QTY</TableCell>
                            <TableCell>Total QTY</TableCell>
                            <TableCell>Dip QTY</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>CH-1</TableCell>
                            <TableCell>{ch1Cm}</TableCell>
                            <TableCell>{ch1qty}</TableCell>
                            <TableCell>{ch1OpeningCm}</TableCell>
                            <TableCell>{ch1Openingqty} Lt.</TableCell>
                            <TableCell>{ch1QtyToBeReturn} Lt.</TableCell>
                            <TableCell>{ch1FullLoadAddCm}</TableCell>
                            <TableCell>{ch1FullLoadAddqty} Lt.</TableCell>
                            <TableCell>{ch1FullLoadTotalqty} Lt.</TableCell>
                            <TableCell>{ch1FullLoadDipqty} Lt.</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>CH-2</TableCell>
                            <TableCell>{ch2Cm}</TableCell>
                            <TableCell>{ch2qty}</TableCell>
                            <TableCell>{ch2OpeningCm}</TableCell>
                            <TableCell>{ch2Openingqty} Lt.</TableCell>
                            <TableCell>{ch2QtyToBeReturn} Lt.</TableCell>
                            <TableCell>{ch2FullLoadAddCm}</TableCell>
                            <TableCell>{ch2FullLoadAddqty} Lt.</TableCell>
                            <TableCell>{ch2FullLoadTotalqty} Lt.</TableCell>
                            <TableCell>{ch2FullLoadTotalqtyByDip} Lt.</TableCell>
                        </TableRow>
                        <TableRow className='font-semibold'>
                            <TableCell>Total</TableCell>
                            <TableCell>{totalClosingCm}</TableCell>
                            <TableCell>{totalClosingQty} Lt.</TableCell>
                            <TableCell>{totalOpeningCm}</TableCell>
                            <TableCell>{totalOpeningQty} Lt.</TableCell>
                            <TableCell>{totalQtyToBeReturned} Lt.</TableCell>
                            <TableCell>{totalLoadHeight}</TableCell>
                            <TableCell>{totalLoadQty} Lt.</TableCell>
                            <TableCell>{totalLoadedQty} Lt.</TableCell>
                            <TableCell>{totalLoadedQtyByDip} Lt.</TableCell>
                        </TableRow>
                        <TableRow className='font-semibold'>
                            <TableCell className='font-semibold'>Machine Reading</TableCell>
                            <TableCell>Lt.</TableCell>
                            <TableCell colSpan={2}>HSD Consumption</TableCell>
                            <TableCell>KM</TableCell>
                            <TableCell colSpan={4}>Load Qty</TableCell>
                            <TableCell>{fullLoadQtyBySlip}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className='font-semibold'>Opening</TableCell>
                            <TableCell>{openingPumpReading}</TableCell>
                            <TableCell className='font-semibold' colSpan={2}>Opening</TableCell>
                            <TableCell>{openingOdoMeter}</TableCell>
                            <TableCell className='font-semibold' colSpan={4}>Add Qty</TableCell>
                            <TableCell>{addition}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className='font-semibold'>Closing</TableCell>
                            <TableCell>{closingPumpReading}</TableCell>
                            <TableCell className='font-semibold' colSpan={2}>Closing</TableCell>
                            <TableCell>{closingOdoMeter}</TableCell>
                            <TableCell className='font-semibold' colSpan={4}>Return Qty</TableCell>
                            <TableCell>{unload}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className='font-semibold'>Machine Sale Qty</TableCell>
                            <TableCell>{machineSaleQty}</TableCell>
                            <TableCell className='font-semibold' colSpan={2}>Return KM</TableCell>
                            <TableCell>{distance} Km</TableCell>
                            <TableCell className='font-semibold' colSpan={4}>Net Load Qty</TableCell>
                            <TableCell>{netLoadQty} Lt.</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2} rowSpan={4}></TableCell>
                            <TableCell colSpan={2}>HSD @{hsdPerKm}KM/Lt.</TableCell>
                            <TableCell>{hsdConsumption}</TableCell>
                            <TableCell className='font-semibold' colSpan={4}>Qty. (Short)/Excess (Bal. Dip)</TableCell>
                            <TableCell>{shortExcess}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2} className='font-semibold'>Pump Consum. Qty</TableCell>
                            <TableCell>{pumpConsumption}</TableCell>
                            <TableCell colSpan={4}>Sale as per Load</TableCell>
                            <TableCell>{saleAsPerLoad}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2} className='font-semibold'>Filled by Driver</TableCell>
                            <TableCell>{filledByDriver}</TableCell>
                            <TableCell colSpan={4}>Sale as per Driver</TableCell>
                            <TableCell>{saleAsPerDriver}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2} className='font-semibold'>Short/(Excess)</TableCell>
                            <TableCell>{shortOrExcessByDriver}</TableCell>
                            <TableCell colSpan={4}>Excess/(Short) Sales</TableCell>
                            <TableCell>{shortOrExcessAsPerRecord}</TableCell>
                        </TableRow>
                        <TableRow className='font-semibold'>
                            <TableCell colSpan={3}>Distribution Cost</TableCell>
                            <TableCell colSpan={4}></TableCell>
                            <TableCell colSpan={3} className='font-semibold text-center'>Deduction Details</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2}>Toll Tax</TableCell>
                            <TableCell>{tollTax}</TableCell>
                            <TableCell colSpan={4}></TableCell>
                            <TableCell colSpan={2} className='font-semibold text-center'>HSD Rate For Deduction</TableCell>
                            <TableCell>{hsdRateFor} /Lt.</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2}>Driver Fooding</TableCell>
                            <TableCell>{driverFooding}</TableCell>
                            <TableCell colSpan={4}></TableCell>
                            <TableCell colSpan={2} rowSpan={3} className='font-semibold text-left'>Deductable Excess Fueling Value</TableCell>
                            <TableCell rowSpan={3}>{deductableExcessFuelingValue}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2}>Driver Salery</TableCell>
                            <TableCell>{driverSalary}</TableCell>
                            <TableCell colSpan={4}></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2}>Fueling Cost</TableCell>
                            <TableCell>{fuelingCost}</TableCell>
                            <TableCell colSpan={4}></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2}>Border Other Exp</TableCell>
                            <TableCell>{borderOtherExp}</TableCell>
                            <TableCell colSpan={4}></TableCell>
                            <TableCell colSpan={2} rowSpan={3} className='font-semibold text-left'>Deductable Short Sale Value</TableCell>
                            <TableCell rowSpan={3}>{deductableShortSale}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2}>Reward</TableCell>
                            <TableCell>{reward}</TableCell>
                            <TableCell colSpan={7}></TableCell>
                        </TableRow>
                        <TableRow className='font-semibold'>
                            <TableCell colSpan={2}>Total Distribution Cost</TableCell>
                            <TableCell>{totalDistributionCost}</TableCell>
                            <TableCell colSpan={7}></TableCell>
                        </TableRow>
                        <TableRow className='font-semibold'>
                            <TableCell colSpan={2}>Distribution Cost per Ltr.</TableCell>
                            <TableCell>{distributionCostPerLtr}</TableCell>
                            <TableCell colSpan={4}></TableCell>
                            <TableCell colSpan={2}>Total Diduction Amount</TableCell>
                            <TableCell>{totalDeduction}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={10}></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2}>Driver</TableCell>
                            <TableCell colSpan={3}><span className='relative flex gap-3'>Supervisor <Image src="/assets/sahil-sign.png" alt="Sahil's signature" width={120} height={40} className='-bottom-3 left-20 absolute' /></span></TableCell>
                            <TableCell colSpan={2}>Verified by</TableCell>
                            <TableCell colSpan={3}>Deducted by</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

export default FinalPrint