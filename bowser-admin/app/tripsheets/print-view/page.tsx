"use client"
import React, { useState } from 'react'
import './styles.css'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, } from '@/components/ui/table';
import { Button, } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toaster } from "@/components/ui/toaster"

const page = () => {
    const [bowser, setBowser] = useState<string>("GT2005")
    const [ch1Cm, setCh1Cm] = useState<string>("0")
    const [ch1qty, setCh1qty] = useState<string>("")
    const [ch1OpeningCm, setCh1OpeningCm] = useState<string>("5")
    const [ch1Openingqty, setCh1Openingqty] = useState<string>("29")
    const [ch1QtyToBeReturn, setCh1QtyToBeReturn] = useState<string>("-29")
    const [ch1FullLoadAddCm, setCh1FullLoadAddCm] = useState<string>("100.2")
    const [ch1FullLoadAddqty, setCh1FullLoadAddqty] = useState<string>("2000")
    const [ch1FullLoadTotalqty, setCh1FullLoadTotalqty] = useState<string>("46")
    const [ch1FullLoadDipqty, setCh1FullLoadDipqty] = useState<string>("150")
    const [ch2Cm, setCh2Cm] = useState<string>("0")
    const [ch2qty, setCh2qty] = useState<string>("")
    const [ch2OpeningCm, setCh2OpeningCm] = useState<string>("3")
    const [ch2Openingqty, setCh2Openingqty] = useState<string>("17")
    const [ch2QtyToBeReturn, setCh2QtyToBeReturn] = useState<string>("-17")
    const [ch2FullLoadAddCm, setCh2FullLoadAddCm] = useState<string>("102.2")
    const [ch2FullLoadAddqty, setCh2FullLoadAddqty] = useState<string>("2000")
    const [ch2FullLoadTotalqty, setCh2FullLoadTotalqty] = useState<string>("4000")
    const [ch2FullLoadDipqty, setCh2FullLoadDipqty] = useState<string>("150")
    const [openingMachineReading, setOpeningMachineReading] = useState<string>("692127.98")
    const [openingHSDConsumption, setOpeningHSDConsumption] = useState<string>("86446")
    const [openingLoadAddqty, setOpeingLoadAddqty] = useState<string>("13")
    const [closingMachineReading, setClosingMachineReading] = useState<string>("696186.89")
    const [closingHSDConsumption, setClosingHSDConsumption] = useState<string>("87263")
    const [closingLoadReturnqty, setClosingLoadReturnqty] = useState<string>("")
    const [hsdPerKm, setHsdPerKm] = useState<string>("15")
    const [filledByDriver, setFilledByDriver] = useState<string>("66.05")
    const [saleAsPerDriver, setSaleAsPerDriver] = useState<string>("4059.45")
    const [hsdRateFor, setHsdRateFor] = useState<string>("89.99")
    const [tollTax, setTollTax] = useState<string>("256")
    const [borderOtherExp, setBorderOtherExp] = useState<string>("1100")
    const [saleryDays, setSaleryDays] = useState<string>("4")
    const [foodingDays, setFoodingDays] = useState<string>("4")
    const [rewardTrips, setRewardTrips] = useState<string>("1")



    return (
        <div className='p-6'>
            {/* <h1 className='my-3 font-semibold text-xl'>Bowser Final Calculation Sheet</h1> */}
            <Table>
                <TableBody>
                    <TableRow className='font-semibold'>
                        <TableCell className='text-xl' colSpan={4}>Bowser Final Calculation Sheet</TableCell>
                        <TableCell>Fooding Days</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={foodingDays} onChange={(e) => setFoodingDays(e.target.value)} /></TableCell>
                        <TableCell>Salery Days</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={saleryDays} onChange={(e) => setSaleryDays(e.target.value)} /></TableCell>
                        <TableCell>Reward Trip(s)</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={rewardTrips} onChange={(e) => setRewardTrips(e.target.value)} /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={10}></TableCell>
                    </TableRow>
                    <TableRow className='font-semibold'>
                        <TableCell>Vehicle No.</TableCell>
                        <TableCell colSpan={2}> <Input className='focus-visible:ring-0' value={bowser} /> </TableCell>
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
                        <TableCell><Input className='focus-visible:ring-0' value={ch1Cm} onChange={(e) => setCh1Cm(e.target.value)} /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch1qty} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch1OpeningCm} onChange={(e) => { setCh1OpeningCm(e.target.value) }} /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch1Openingqty} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch1qty) - Number(ch1Openingqty)} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch1FullLoadAddCm} onChange={(e) => { setCh1FullLoadAddCm(e.target.value) }} /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch1FullLoadAddqty} onChange={(e) => { setCh1FullLoadAddqty(e.target.value) }} /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch1FullLoadTotalqty} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch1FullLoadDipqty} readOnly /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>CH-2</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch2Cm} onChange={(e) => { setCh2Cm(e.target.value) }} /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch2qty} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch2OpeningCm} onChange={(e) => { setCh2OpeningCm(e.target.value) }} /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch2Openingqty} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch2qty) - Number(ch2Openingqty)} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch2FullLoadAddCm} onChange={(e) => { setCh2FullLoadAddCm(e.target.value) }} /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch2FullLoadAddqty} onChange={(e) => { setCh2FullLoadAddqty(e.target.value) }} /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch2FullLoadTotalqty} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={ch2FullLoadDipqty} readOnly /></TableCell>
                    </TableRow>
                    <TableRow className='font-semibold'>
                        <TableCell>Total</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch1Cm) + Number(ch2Cm)} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch1qty) + Number(ch2qty)} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch1OpeningCm) + Number(ch2OpeningCm)} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch1Openingqty) + Number(ch2Openingqty)} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch1QtyToBeReturn) + Number(ch2QtyToBeReturn)} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch1FullLoadAddCm) + Number(ch2FullLoadAddCm)} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch1FullLoadAddqty) + Number(ch2FullLoadAddqty)} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch1FullLoadTotalqty) + Number(ch2FullLoadTotalqty)} readOnly /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(ch1FullLoadDipqty) + Number(ch2FullLoadDipqty)} readOnly /></TableCell>
                    </TableRow>
                    <TableRow className='font-semibold'>
                        <TableCell className='font-semibold'>Machine Reading</TableCell>
                        <TableCell>Lt.</TableCell>
                        <TableCell colSpan={2}>HSD Consumption</TableCell>
                        <TableCell>KM</TableCell>
                        <TableCell colSpan={4}>Load Qty</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={(Number(ch1FullLoadAddqty) + Number(ch2FullLoadAddqty)).toFixed(2)} readOnly /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className='font-semibold'>Opening</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={openingMachineReading} onChange={(e) => { setOpeningMachineReading(e.target.value) }} /></TableCell>
                        <TableCell className='font-semibold' colSpan={2}>Opening</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={openingHSDConsumption} onChange={(e) => { setOpeningHSDConsumption(e.target.value) }} /></TableCell>
                        <TableCell className='font-semibold' colSpan={4}>Add Qty</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={openingLoadAddqty} onChange={(e) => { setOpeingLoadAddqty(e.target.value) }} /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className='font-semibold'>Closing</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={closingMachineReading} onChange={(e) => { setClosingMachineReading(e.target.value) }} /></TableCell>
                        <TableCell className='font-semibold' colSpan={2}>Closing</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={closingHSDConsumption} onChange={(e) => { setClosingHSDConsumption(e.target.value) }} /></TableCell>
                        <TableCell className='font-semibold' colSpan={4}>Return Qty</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={closingLoadReturnqty} onChange={(e) => { setClosingLoadReturnqty(e.target.value) }} /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className='font-semibold'>Machine Sale Qty</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={(Number(closingMachineReading) - Number(openingMachineReading)).toFixed(2)} readOnly /></TableCell>
                        <TableCell className='font-semibold' colSpan={2}>Return KM</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={(Number(closingHSDConsumption) - Number(openingHSDConsumption))} readOnly /></TableCell>
                        <TableCell className='font-semibold' colSpan={4}>Net Load Qty</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={((Number(ch1FullLoadAddqty) + Number(ch2FullLoadAddqty)) + Number(openingLoadAddqty) - Number(closingLoadReturnqty)).toFixed(2)} readOnly /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2} rowSpan={4}></TableCell>
                        <TableCell colSpan={2}><Input className='focus-visible:ring-0' value={hsdPerKm} onChange={(e) => { setHsdPerKm(e.target.value) }} /></TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Math.round(((Number(closingHSDConsumption) - Number(openingHSDConsumption)) / Number(hsdPerKm))).toFixed(2)} readOnly /></TableCell>
                        <TableCell className='font-semibold' colSpan={4}>Qty. (Short)/Excess (Bal. Dip)</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={((Number(ch1qty) + Number(ch2qty)) - (Number(ch1Openingqty) + Number(ch2Openingqty))).toFixed(2)} readOnly /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2} className='font-semibold'>Pump Consum. Qty</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Math.round(1 * ((Number(closingMachineReading) - Number(openingMachineReading))) / 1000)} readOnly /></TableCell>
                        <TableCell colSpan={4}>Sale as per Load</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={(((Number(ch1FullLoadAddqty) + Number(ch2FullLoadAddqty)) + (Number(openingLoadAddqty)) - (Number(closingLoadReturnqty))) - ((Number(ch1qty) + Number(ch2qty)) - (Number(ch1Openingqty) + Number(ch2Openingqty)))).toFixed(2)} readOnly /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2} className='font-semibold'>Filled by Driver</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={filledByDriver} onChange={(e) => { setFilledByDriver(e.target.value) }} /></TableCell>
                        <TableCell colSpan={4}>Sale as per Driver</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={saleAsPerDriver} onChange={(e) => { setSaleAsPerDriver(e.target.value) }} /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2} className='font-semibold'>Short/(Excess)</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={((Number(Math.round(((Number(closingHSDConsumption) - Number(openingHSDConsumption)) / Number(hsdPerKm))).toFixed(2)) + (Number(Math.round(1 * ((Number(closingMachineReading) - Number(openingMachineReading))) / 1000)))) - (Number(filledByDriver))).toFixed(2)} readOnly /></TableCell>
                        <TableCell colSpan={4}>Excess/(Short) Sales</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={((Number(saleAsPerDriver)) - Number((((Number(ch1FullLoadAddqty) + Number(ch2FullLoadAddqty)) + (Number(openingLoadAddqty)) - (Number(closingLoadReturnqty))) - Number((Number(ch1qty) + Number(ch2qty)) - (Number(ch1Openingqty) + Number(ch2Openingqty)))).toFixed(2))).toFixed(2)} readOnly /></TableCell>
                    </TableRow>
                    <TableRow className='font-semibold'>
                        <TableCell colSpan={3}>Distribution Cost</TableCell>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell colSpan={3} className='font-semibold text-center'>Deduction Details</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2}>Toll Tax</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={tollTax} onChange={(e) => setTollTax(e.target.value)} /></TableCell>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell colSpan={2} className='font-semibold text-center'>HSD Rate for</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={hsdRateFor} onChange={(e) => setHsdRateFor(e.target.value)} /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2}>Driver Fooding</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(foodingDays) * 200} readOnly /></TableCell>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell colSpan={2} className='font-semibold text-left'>Deductable Excess Fueling Value</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={(Number(Number(((Number(Math.round(((Number(closingHSDConsumption) - Number(openingHSDConsumption)) / Number(hsdPerKm))).toFixed(2)) + (Number(Math.round(1 * ((Number(closingMachineReading) - Number(openingMachineReading))) / 1000)))) - (Number(filledByDriver))).toFixed(2)) < -Math.round(Number(hsdPerKm) * 0.05) ? -Number(((Number(Math.round(((Number(closingHSDConsumption) - Number(openingHSDConsumption)) / Number(hsdPerKm))).toFixed(2)) + (Number(Math.round(1 * ((Number(closingMachineReading) - Number(openingMachineReading))) / 1000)))) - (Number(filledByDriver))).toFixed(2)) : 0) * Number(hsdRateFor)).toFixed(2)} readOnly /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2}>Driver Salery</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(saleryDays) * 500} readOnly /></TableCell>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell colSpan={2} className='font-semibold text-left'>Deductable Short Sale Value</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number((Number(((Number(saleAsPerDriver)) - Number((((Number(ch1FullLoadAddqty) + Number(ch2FullLoadAddqty)) + (Number(openingLoadAddqty)) - (Number(closingLoadReturnqty))) - Number((Number(ch1qty) + Number(ch2qty)) - (Number(ch1Openingqty) + Number(ch2Openingqty)))).toFixed(2))).toFixed(2)) < -5 ? -Number(((Number(saleAsPerDriver)) - Number((((Number(ch1FullLoadAddqty) + Number(ch2FullLoadAddqty)) + (Number(openingLoadAddqty)) - (Number(closingLoadReturnqty))) - Number((Number(ch1qty) + Number(ch2qty)) - (Number(ch1Openingqty) + Number(ch2Openingqty)))).toFixed(2))).toFixed(2)) : 0) * Number(hsdRateFor)).toFixed(2)} readOnly /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2}>Fueling Cost</TableCell>
                        <TableCell><Input readOnly className='focus-visible:ring-0' value={Math.round((Number(hsdRateFor)) * (Number(filledByDriver)))} /></TableCell>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell colSpan={2} className='font-semibold text-left'>Total Deductable</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={(((Number(Number(((Number(Math.round(((Number(closingHSDConsumption) - Number(openingHSDConsumption)) / Number(hsdPerKm)))) + (Number(Math.round(1 * ((Number(closingMachineReading) - Number(openingMachineReading))) / 1000)))) - (Number(filledByDriver)))) < -Math.round(Number(hsdPerKm) * 0.05) ? -Number(((Number(Math.round(((Number(closingHSDConsumption) - Number(openingHSDConsumption)) / Number(hsdPerKm)))) + (Number(Math.round(1 * ((Number(closingMachineReading) - Number(openingMachineReading))) / 1000)))) - (Number(filledByDriver)))) : 0) * Number(hsdRateFor))) + (Number((Number(((Number(saleAsPerDriver)) - Number((((Number(ch1FullLoadAddqty) + Number(ch2FullLoadAddqty)) + (Number(openingLoadAddqty)) - (Number(closingLoadReturnqty))) - Number((Number(ch1qty) + Number(ch2qty)) - (Number(ch1Openingqty) + Number(ch2Openingqty))))))) < -5 ? -Number(((Number(saleAsPerDriver)) - Number((((Number(ch1FullLoadAddqty) + Number(ch2FullLoadAddqty)) + (Number(openingLoadAddqty)) - (Number(closingLoadReturnqty))) - Number((Number(ch1qty) + Number(ch2qty)) - (Number(ch1Openingqty) + Number(ch2Openingqty))))))) : 0) * Number(hsdRateFor)))).toFixed(2)} readOnly /></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2}>Border Other Exp</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={borderOtherExp} onChange={(e) => setBorderOtherExp(e.target.value)} /></TableCell>
                        <TableCell colSpan={7}></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2}>Reward</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number(rewardTrips) * 300} readOnly /></TableCell>
                        <TableCell colSpan={7}></TableCell>
                    </TableRow>
                    <TableRow className='font-semibold'>
                        <TableCell colSpan={2}>Total Distribution Cost</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Math.round(Number(tollTax) + Number(Number(foodingDays) * 200) + Number(Number(saleryDays) * 500) + Math.round((Number(hsdRateFor)) * Number(filledByDriver)) + Number(Number(rewardTrips) * 300) + Number(borderOtherExp))} readOnly /></TableCell>
                        <TableCell colSpan={7}></TableCell>
                    </TableRow>
                    <TableRow className='font-semibold'>
                        <TableCell colSpan={2}>Distribution Cost per Ltr.</TableCell>
                        <TableCell><Input className='focus-visible:ring-0' value={Number((Math.round(Number(tollTax) + Number(Number(foodingDays) * 200) + Number(Number(saleryDays) * 500) + Math.round((Number(hsdRateFor)) * Number(filledByDriver)) + Number(Number(rewardTrips) * 300) + Number(borderOtherExp))) / ((((Number(ch1FullLoadAddqty) + Number(ch2FullLoadAddqty)) + (Number(openingLoadAddqty)) - (Number(closingLoadReturnqty))) - ((Number(ch1qty) + Number(ch2qty)) - (Number(ch1Openingqty) + Number(ch2Openingqty)))))).toFixed(2)} readOnly /></TableCell>
                        <TableCell colSpan={7}></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={10}></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2}>Driver</TableCell>
                        <TableCell colSpan={3}>Supervisor</TableCell> {/*  <span className='text-lg underline'>Sahil</span> */}
                        <TableCell colSpan={2}>Verified by</TableCell>
                        <TableCell colSpan={3}>Deducted by</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    )
}

export default page