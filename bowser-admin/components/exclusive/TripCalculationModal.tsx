"use client"
import React, { useEffect, useState } from "react";
import { Table, TableRow, TableBody, TableCell, TableHeader } from "@/components/ui/table";
import { WholeTripSheet } from "@/types";
import { formatDate } from "@/lib/utils";
import "./style.css"
import Image from "next/image";

interface TripCalculationModalProps {
  record: WholeTripSheet; // Trip sheet details
}

const FinalPrint: React.FC<TripCalculationModalProps> = ({ record }) => {
  useEffect(() => {
    if (window !== undefined) {
      const menuIcon = document.getElementById("menuIcon");
      if (menuIcon) {
        menuIcon.style.display = "none";
      }
    }
  }, []);

  console.log(record);
  const [bowser, setBowser] = useState<string>(record?.bowser.regNo);
  //chamber 1
  const [ch1Cm, setCh1Cm] = useState<number>(
    record?.settelment?.details?.chamberwiseDipList.find(
      (chamber) => chamber.chamberId === "Chamber-1"
    )?.levelHeight || 0
  );
  const [ch1qty, setCh1qty] = useState<number>(
    Number(
      record?.settelment?.details?.chamberwiseDipList
        .find((chamber) => chamber.chamberId === "Chamber-1")
        ?.qty.toFixed(2)
    ) || 0
  );
  const [ch1OpeningCm, setCh1OpeningCm] = useState<number>(
    record?.loading.sheetId?.chamberwiseDipListBefore.find(
      (chamber) => chamber.chamberId === "Chamber-1"
    )?.levelHeight || 0
  );
  const [ch1Openingqty, setCh1Openingqty] = useState<number>(
    Number(
      record?.loading.sheetId?.chamberwiseDipListBefore
        .find((chamber) => chamber.chamberId === "Chamber-1")
        ?.qty.toFixed(2)
    )
  );
  const [ch1QtyToBeReturn, setCh1QtyToBeReturn] = useState<number>(
    Number(
      ch1qty !== null && ch1qty !== undefined
        ? (ch1qty - ch1Openingqty).toFixed(2)
        : 0
    )
  );
  const [ch1FullLoadAddCm, setCh1FullLoadAddCm] = useState<number>(
    record?.loading.sheetId.chamberwiseDipListAfter.find(
      (chamber) => chamber.chamberId === "Chamber-1"
    )?.levelHeight || 0
  );
  const [ch1FullLoadAddqty, setCh1FullLoadAddqty] = useState<number>(
    record?.loading.quantityBySlip / 2
  );
  const [ch1FullLoadTotalqty, setCh1FullLoadTotalqty] = useState<number>(
    ch1FullLoadAddqty + ch1Openingqty
  );
  const [ch1FullLoadDipqty, setCh1FullLoadDipqty] = useState<number>(
    Number(record?.loading.sheetId.chamberwiseDipListAfter[0].qty.toFixed(2))
  );
  //chamber 2
  const [ch2Cm, setCh2Cm] = useState<number>(
    record?.settelment?.details?.chamberwiseDipList.find(
      (chamber) => chamber.chamberId === "Chamber-2"
    )?.levelHeight || 0
  );
  const [ch2qty, setCh2qty] = useState<number>(
    Number(
      record?.settelment?.details?.chamberwiseDipList
        .find((chamber) => chamber.chamberId === "Chamber-2")
        ?.qty.toFixed(2)
    ) || 0
  );
  const [ch2OpeningCm, setCh2OpeningCm] = useState<number>(
    record?.loading.sheetId?.chamberwiseDipListBefore.find(
      (chamber) => chamber.chamberId === "Chamber-2"
    )?.levelHeight || 0
  );
  const [ch2Openingqty, setCh2Openingqty] = useState<number>(
    Number(
      record?.loading.sheetId?.chamberwiseDipListBefore
        .find((chamber) => chamber.chamberId === "Chamber-2")
        ?.qty.toFixed(2)
    )
  );
  const [ch2QtyToBeReturn, setCh2QtyToBeReturn] = useState<number>(
    Number(
      ch2qty !== null && ch2qty !== undefined
        ? (ch2qty - ch2Openingqty).toFixed(2)
        : 0
    )
  );
  const [ch2FullLoadAddCm, setCh2FullLoadAddCm] = useState<number>(
    record?.loading.sheetId.chamberwiseDipListAfter.find(
      (chamber) => chamber.chamberId === "Chamber-2"
    )?.levelHeight || 0
  );
  const [ch2FullLoadAddqty, setCh2FullLoadAddqty] = useState<number>(
    Number((record?.loading.quantityBySlip / 2).toFixed(2))
  );
  const [ch2FullLoadTotalqty, setCh2FullLoadTotalqty] = useState<number>(
    ch2FullLoadAddqty + ch2Openingqty
  );
  const [ch2FullLoadTotalqtyByDip, setCh2FullLoadTotalqtyByDip] =
    useState<number>(
      Number(
        (
          record?.loading.sheetId.chamberwiseDipListAfter.find(
            (chamber) => chamber.chamberId === "Chamber-2"
          )?.qty || 0
        ).toFixed(2)
      )
    );
  //total
  const [totalClosingCm, setTotalClosingCm] = useState<number>(ch1Cm + ch2Cm);
  const [totalClosingQty, setTotalClosingQty] = useState<number>(
    Number((ch1qty + ch2qty).toFixed(2))
  );
  const [totalOpeningCm, setTotalOpeningCm] = useState<number>(
    Number((ch1OpeningCm + ch2OpeningCm).toFixed(2))
  );
  const [totalOpeningQty, setTotalOpeningQty] = useState<number>(
    Number((ch1Openingqty + ch2Openingqty).toFixed(2))
  );
  const [totalQtyToBeReturned, setTotalQtyToBeReturned] = useState<number>(
    Number((ch1QtyToBeReturn + ch2QtyToBeReturn).toFixed(2))
  );
  const [totalLoadHeight, setTotalLoadHeight] = useState<number>(
    ch1FullLoadAddCm + ch2FullLoadAddCm
  );
  const [totalLoadedQty, setTotalLoadedQty] = useState<number>(
    ch1FullLoadTotalqty + ch2FullLoadTotalqty
  );
  const [totalLoadedQtyByDip, setTotalLoadedQtyByDip] = useState<number>(
    Number(record?.tempLoadByDip?.toFixed(2)) || 0
  );
  const [totalLoadedQtyBySlip, setTotalLoadedQtyBySlip] = useState<number>(
    Number(record?.totalLoadQuantityBySlip?.toFixed(2)) || 0
  );
  // heading and slip total on load
  const [loadQty, setLoadQty] = useState<number>(
    Number(record?.loading.quantityBySlip.toFixed(2)) || 0
  );
  // pump reading, Odo meter and addition
  // while opeing (trip hseet creation) (from loading sheet)
  const [openingPumpReading, setOpeningPumpReading] = useState<number>(
    record?.loading.sheetId.pumpReadingAfter
  );
  const [openingOdoMeter, setOpeningOdometer] = useState<number>(
    record?.loading.sheetId.odoMeter
  );
  const [addition, setAddition] = useState<number>(
    record?.totalAdditionQtyBySlip || 0
  );
  // while closing (settlment)
  const [closingPumpReading, setclosingPumpReading] = useState<number>(
    record?.settelment?.details.pumpReading || 0
  );
  const [closingOdoMeter, setclosingOdometer] = useState<number>(
    record?.settelment?.details.odometer || 0
  );
  const [unload, setUnLoad] = useState<number>(
    record.settelment?.details.extras?.unload || 0
  );
  //calculations
  const [machineSaleQty, setMachineSaleQty] = useState<number>(
    Number((closingPumpReading - openingPumpReading).toFixed(2))
  );
  const [distance, setDistance] = useState<number>(
    closingOdoMeter - openingOdoMeter
  );
  const [netLoadQty, setNetLoadQty] = useState<number>(
    Number(((loadQty + addition) - unload).toFixed(2))
  );
  // HSD consumption, short excess
  const [hsdPerKm, setHsdPerKm] = useState<number>(
    Number((record.settelment?.details.extras?.hsdPerKm || 0).toFixed(2))
  );
  const [hsdConsumption, setHsdConsumption] = useState<number>(
    distance > 0 && hsdPerKm > 0 ? Math.round(distance / hsdPerKm) : 0
  );
  //pump consumtion & sale as per load
  const [pumpConsumption, setPumpConsumption] = useState<number>(
    machineSaleQty > 0 ? Math.round((1 * machineSaleQty) / 1000) : 0
  );
  // filled by driver, sale as per driver
  const [filledByDriver, setFilledByDriver] = useState<number>(
    record.settelment?.details.extras?.filledByDriver || 0
  );
  const [saleAsPerDriver, setSaleAsPerDriver] = useState<number>(
    Number((record?.saleQty || 0).toFixed(2))
  );
  // short/excess & excess/short(sale)
  const [shortOrExcessByDriver, setShortOrExcessByDriver] = useState<number>(
    hsdConsumption + pumpConsumption - (filledByDriver || 0)
  );
  const [hsdRateForDeduction, setHsdRateForDeduction] = useState<number>(
    record.hsdRate || record.settelment?.details.extras.hsdRateFor || 0
  );
  const [tollTax, setTollTax] = useState<number>(
    record.settelment?.details.extras?.tollTax || 0
  );
  const [driverFooding, setDriverFooding] = useState<number | undefined>(record.settelment?.details.extras?.foodingTotal);
  const [driverSalary, setDriverSalary] = useState<number | undefined>(record.settelment?.details.extras?.saleryTotal);
  const [fuelingCost, setFuelingCost] = useState<number>(
    Math.round(hsdRateForDeduction * filledByDriver)
  );
  const [borderOtherExp, setBorderOtherExp] = useState<number>(record.settelment?.details.extras?.borderOtherExp || 0);
  const [reward, setReward] = useState<number | undefined>(record.settelment?.details.extras?.rewardTotal);
  // =IF(F14<-ROUND(F11*5%,2),-F14,0)*K16
  const [deductableExcessFuelingValue, setDeductableExcessFuelingValue] =
    useState<number>(
      Number(((shortOrExcessByDriver < -parseFloat((hsdConsumption * 0.05).toFixed(2))
        ? -shortOrExcessByDriver
        : 0) * hsdRateForDeduction).toFixed(2))
    );
  const [saleAsPerReading, setSealeAsPerReading] = useState(((record?.settelment?.details.pumpReading || 0) - record?.loading.sheetId.pumpReadingAfter).toFixed(2));
  const [totalLoadQty, setTotalLoadQty] = useState<number>(totalOpeningQty + loadQty + addition);
  const [saleAsPerLoad, setSaleAsPerLoad] = useState<number>(totalLoadQty - totalClosingQty);
  const [shortExcess, setShortExcess] = useState<number>(
    Number((saleAsPerDriver - saleAsPerLoad).toFixed(2))
  );
  const [shortOrExcessAsPerRecord, setShortOrExcessAsPerRecord] = useState<number>(saleAsPerDriver - saleAsPerLoad);
  // =IF(K14<-5,-K14,0)*K16
  const [deductableShortSale, setDeductableShortSale] = useState<number>(
    Number(((shortOrExcessAsPerRecord < -5 ? -shortOrExcessAsPerRecord : 0) * hsdRateForDeduction).toFixed(2))
  );
  const [totalDeduction, setTotalDeduction] = useState<number>(
    Number((deductableExcessFuelingValue + deductableShortSale).toFixed(2))
  );
  const [totalDistributionCost, setTotalDistributionCost] = useState<number>(
    (tollTax ?? 0) + (driverFooding ?? 0) + (driverSalary ?? 0) + (fuelingCost ?? 0) + (borderOtherExp ?? 0) + (reward ?? 0)
  );
  const [distributionCostPerLtr, setDistributionCostPerLtr] = useState<string>((totalDistributionCost / saleAsPerDriver).toFixed(2));

  return (
    <div className="bg-white p-4 text-black">
      <h2 className="mb-2 font-bold text-xl text-center">Bowser Tripsheet Settlement Statement</h2>
      <Table className="border border-black">
        <TableBody>
          <TableRow className="border-none">
            <TableCell className="border border-black">Driver Name</TableCell>
            <TableCell className="border border-black">{record?.bowser.driver[0].name}</TableCell>
            <TableCell className="border border-black font-bold text-right">Tripsheet No.</TableCell>
            <TableCell className="border border-black font-bold text-right">{record?.tripSheetId}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black" colSpan={2}>Driver ID</TableCell>
            {/* <TableCell className="border border-black">{record?.bowser.driver[0].name}</TableCell> */}
            <TableCell className="border border-black font-bold text-right">Settlement Date</TableCell>
            <TableCell className="border border-black font-bold text-right">{formatDate(record?.settelment?.dateTime!)}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Driver Mobile</TableCell>
            <TableCell className="border border-black">{record?.bowser.driver[0].phoneNo}</TableCell>
            <TableCell className="border border-black text-right">Trip Start Date</TableCell>
            <TableCell className="border border-black text-right">{formatDate(record?.createdAt!)}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Distribution Area</TableCell>
            <TableCell className="border border-black">{record?.fuelingAreaDestination}</TableCell>
            <TableCell className="border border-black font-bold text-right">Bowser No.</TableCell>
            <TableCell className="border border-black font-bold text-right">{record?.bowser.regNo}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h3 className="font-bold">Bowser Departure & Return</h3>
      <Table className="border border-black">
        <TableBody>
          <TableRow className="border-none">
            <TableCell className="border border-black">Departure Date</TableCell>
            <TableCell className="border border-black">{formatDate(record?.proposedDepartureTime!)}</TableCell>
            <TableCell className="border border-black">Return Date</TableCell>
            <TableCell className="border border-black">{formatDate(record?.settelment?.dateTime!)}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Bowser Departure Odometer</TableCell>
            <TableCell className="border border-black text-right">{record?.loading.sheetId.odoMeter}</TableCell>
            <TableCell className="border border-black">Bowser Return Odometer</TableCell>
            <TableCell className="border border-black text-right">{record.settelment?.details.odometer}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Pump Departure Reading</TableCell>
            <TableCell className="border border-black text-right">{record?.loading.sheetId.pumpReadingAfter}</TableCell>
            <TableCell className="border border-black">Pump Return Reading</TableCell>
            <TableCell className="border border-black text-right">{record?.settelment?.details.pumpReading}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h3 className="font-bold">Loading & Distribution Summary</h3>
      <Table className="border border-black">
        <TableBody>
          <TableRow className="border-none">
            <TableCell className="border border-black">Opening Qty as per Dip</TableCell>
            <TableCell className="border border-black text-right">{totalOpeningQty} Lt.</TableCell>
            <TableCell className="border border-black">Qty Returned back in main stock</TableCell>
            <TableCell className="border border-black text-right">{unload} Lt.</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Loading Qty as per Slip</TableCell>
            <TableCell className="border border-black text-right">{loadQty} Lt.</TableCell>
            <TableCell className="border border-black">Sale as per Reading</TableCell>
            <TableCell className="border border-black text-right">{saleAsPerReading} Lt.</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Addition Qty as per Slip</TableCell>
            <TableCell className="border border-black text-right">{addition} Lt.</TableCell>
            <TableCell className="border border-black">Sale as per Driver</TableCell>
            <TableCell className="border border-black text-right">{saleAsPerDriver} Lt.</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Total Loaded Qty</TableCell>
            <TableCell className="border border-black text-right">{totalLoadQty} Lt.</TableCell>
            <TableCell className="border border-black">Sale as per Load</TableCell>
            <TableCell className="border border-black font-bold text-right">{saleAsPerLoad} Lt.</TableCell>
          </TableRow>
          <TableRow className="border border-black font-bold">
            <TableCell className="border border-black">Net Load Qty</TableCell>
            <TableCell className="border border-black text-right">{netLoadQty} Lt.</TableCell>
            <TableCell className="border border-black">Excess/(Short) Sale</TableCell>
            <TableCell className="border border-black text-right">{shortExcess} Lt.</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h3 className="font-bold">Quantitative Statement as per Calibration</h3>
      <div className="flex flex-row justify-between gap-3 w-full">
        <Table>
          <TableHeader className="border-none font-bold">
            <TableRow className="border-none">
              <TableCell className="border border-black" rowSpan={2}>Particulars</TableCell>
              <TableCell className="border border-black" colSpan={2}>Chamber #1</TableCell>
              <TableCell className="border border-black" colSpan={2}>Chamber #2</TableCell>
              <TableCell className="border border-black">Total</TableCell>
              <TableCell className="border-none"></TableCell>
              <TableCell className="border border-black text-center" colSpan={2} rowSpan={2}>Security Seal</TableCell>
            </TableRow>
            <TableRow className="border-none">
              <TableCell className="border border-black">Dip</TableCell>
              <TableCell className="border border-black">Qty</TableCell>
              <TableCell className="border border-black">Dip</TableCell>
              <TableCell className="border border-black">Qty</TableCell>
              <TableCell className="border border-black">Qty</TableCell>
              <TableCell className="border-none"></TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-none">
              <TableCell className="border border-black">Before Loading</TableCell>
              <TableCell className="border border-black text-right">{ch1OpeningCm} cm</TableCell>
              <TableCell className="border border-black text-right">{ch1Openingqty} Lt.</TableCell>
              <TableCell className="border border-black text-right">{ch2OpeningCm} cm</TableCell>
              <TableCell className="border border-black text-right">{ch2Openingqty} Lt.</TableCell>
              <TableCell className="border border-black text-right">{totalOpeningQty} Lt.</TableCell>
              <TableCell className="border-none"></TableCell>
              <TableCell className="border border-black font-bold text-center" rowSpan={2}>CH-1</TableCell>
              <TableCell className="border border-black">{record.loading.sheetId.chamberwiseSealList.filter(chamber => chamber.chamberId === "Chamber-1")[0]?.sealId}</TableCell>
            </TableRow>
            <TableRow className="border-none">
              <TableCell className="border border-black">After Loading</TableCell>
              <TableCell className="border border-black text-right">{record?.loading.sheetId.chamberwiseDipListAfter.find(chambers => (chambers.chamberId == "Chamber-1"))?.levelHeight} cm</TableCell>
              <TableCell className="border border-black text-right">{record?.loading.sheetId.chamberwiseDipListAfter.find(chambers => (chambers.chamberId == "Chamber-1"))?.qty} Lt.</TableCell>
              <TableCell className="border border-black text-right">{record?.loading.sheetId.chamberwiseDipListAfter.find(chambers => (chambers.chamberId == "Chamber-2"))?.levelHeight} cm</TableCell>
              <TableCell className="border border-black text-right">{record?.loading.sheetId.chamberwiseDipListAfter.find(chambers => (chambers.chamberId == "Chamber-2"))?.qty} Lt.</TableCell>
              <TableCell className="border border-black text-right">{record?.loading.sheetId.tempLoadByDip.toFixed(2)} Lt.</TableCell>
              <TableCell className="border-none"></TableCell>
              <TableCell className="border border-black">{record.loading.sheetId.chamberwiseSealList.filter(chamber => chamber.chamberId === "Chamber-1")[1]?.sealId}</TableCell>
            </TableRow>
            <TableRow className="border-none">
              <TableCell className="border border-black font-bold">Net Loaded</TableCell>
              <TableCell className="border border-black font-bold text-right">{ch1FullLoadAddCm} cm</TableCell>
              <TableCell className="border border-black font-bold text-right">{ch1FullLoadAddqty} Lt.</TableCell>
              <TableCell className="border border-black font-bold text-right">{ch2FullLoadAddCm} cm</TableCell>
              <TableCell className="border border-black font-bold text-right">{ch2FullLoadAddqty} Lt.</TableCell>
              <TableCell className="border border-black font-bold text-right">{(ch1FullLoadAddqty + ch2FullLoadAddqty).toFixed(2)} Lt.</TableCell>
              <TableCell className="border-none"></TableCell>
              <TableCell className="border border-black font-bold text-center" rowSpan={2}>CH-2</TableCell>
              <TableCell className="border border-black">{record.loading.sheetId.chamberwiseSealList.filter(chamber => chamber.chamberId === "Chamber-2")[0]?.sealId}</TableCell>
            </TableRow>
            <TableRow className="border-none">
              <TableCell className="border border-black font-bold">After Return</TableCell>
              <TableCell className="border border-black font-bold text-right">{ch1Cm} cm</TableCell>
              <TableCell className="border border-black font-bold text-right">{ch1qty} Lt.</TableCell>
              <TableCell className="border border-black font-bold text-right">{ch2Cm} cm</TableCell>
              <TableCell className="border border-black font-bold text-right">{ch2qty} Lt.</TableCell>
              <TableCell className="border border-black font-bold text-right">{totalClosingQty} Lt.</TableCell>
              <TableCell className="border-none"></TableCell>
              <TableCell className="border border-black">{record.loading.sheetId.chamberwiseSealList.filter(chamber => chamber.chamberId === "Chamber-2")[1]?.sealId}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Table className="border-none">
        <TableHeader className="border-none">
          <TableRow className="border-none">
            <TableCell colSpan={2} className="font-bold">Bowser Fuel Consumption</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell colSpan={2} className="font-bold">Deduction Calculation</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="border-none">
          <TableRow className="border-none">
            <TableCell className="border border-black">Total Run KM</TableCell>
            <TableCell className="border border-black text-right">{distance} km</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border border-black">Effective Fuel Prise</TableCell>
            <TableCell className="border border-black text-right">&#8377; {hsdRateForDeduction}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Avg. @{hsdPerKm}KM/Lt.</TableCell>
            <TableCell className="border border-black text-right">{hsdConsumption} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border border-black">Excess Fueling Amount</TableCell>
            <TableCell className="border border-black text-right">&#8377; {deductableExcessFuelingValue}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Fuel Consmed by Pump</TableCell>
            <TableCell className="border border-black text-right">{pumpConsumption} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border border-black">Short Sale Amount</TableCell>
            <TableCell className="border border-black text-right">&#8377; {deductableShortSale}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Estimated Fuel Required</TableCell>
            <TableCell className="border border-black text-right">{(hsdConsumption + pumpConsumption).toFixed(2)} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border border-black font-bold">Total Deductable Amount</TableCell>
            <TableCell className="border border-black font-bold text-right">&#8377; {totalDeduction}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">Filled by Driver</TableCell>
            <TableCell className="border border-black text-right">{filledByDriver} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border-none" colSpan={2}></TableCell>
          </TableRow>
          <TableRow className="border-none font-bold">
            <TableCell className="border border-black">(Short)/Excess</TableCell>
            <TableCell className="border border-black text-right">{shortOrExcessByDriver.toFixed(2)} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border-none" colSpan={2}></TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table className="">
        <TableHeader>
          <TableRow className="border-none">
            <TableCell className="font-bold" colSpan={3}>Computation of Actual Sale</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="font-bold" colSpan={2}>Distribution Cost</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="border-none">
            <TableCell className="border border-black">a)</TableCell>
            <TableCell className="border border-black">Opening Qty as per Dip</TableCell>
            <TableCell className="border border-black text-right">{totalOpeningQty} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border border-black">Toll Tax</TableCell>
            <TableCell className="border border-black text-right">&#8377; {tollTax}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">b)</TableCell>
            <TableCell className="border border-black">Total Loading Qty</TableCell>
            <TableCell className="border border-black text-right">{totalLoadedQtyBySlip} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border border-black">Driver Fooding</TableCell>
            <TableCell className="border border-black text-right">&#8377; {driverFooding}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">c)</TableCell>
            <TableCell className="border border-black">Total Departure Qty</TableCell>
            <TableCell className="border border-black text-right">{(totalLoadedQtyBySlip + totalOpeningQty).toFixed(2)} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border border-black">Driver Salery</TableCell>
            <TableCell className="border border-black text-right">&#8377; {driverSalary}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">d)</TableCell>
            <TableCell className="border border-black">Return back in Main Stock</TableCell>
            <TableCell className="border border-black text-right">{unload.toFixed(2)} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border border-black">Fueling Cost</TableCell>
            <TableCell className="border border-black text-right">&#8377; {fuelingCost}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">e)</TableCell>
            <TableCell className="border border-black">Closing Qty as per Dip</TableCell>
            <TableCell className="border border-black text-right">{totalClosingQty} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border border-black">Border/Other Exp.</TableCell>
            <TableCell className="border border-black text-right">&#8377; {borderOtherExp}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">f)</TableCell>
            <TableCell className="border border-black font-bold">Sale as per Load (c-d-e)</TableCell>
            <TableCell className="border border-black font-bold text-right">{(totalLoadedQtyBySlip + totalOpeningQty) - (unload + totalClosingQty)} Lt.</TableCell>
            <TableCell className="border-none"></TableCell>
            <TableCell className="border border-black">Reward</TableCell>
            <TableCell className="border border-black text-right">&#8377; {reward}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border-none" colSpan={4}></TableCell>
            <TableCell className="border border-black font-bold">Total Distribution Cost</TableCell>
            <TableCell className="border border-black font-bold text-right">&#8377; {totalDistributionCost}</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border-none" colSpan={4}></TableCell>
            <TableCell className="border border-black font-bold">Distribution Cost per Liter</TableCell>
            <TableCell className="border border-black font-bold text-right">&#8377; {distributionCostPerLtr}/Lt.</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="flex flex-row justify-between items-end">
        <h3 className="font-bold">Bowser Loading Details</h3>
        <span className="text-xs text-right">CN = Calibration Needed</span>
      </div>
      <Table className="border border-black">
        <TableBody>
          <TableRow className="border border-black font-bold">
            <TableCell className="border border-black">Loading Date</TableCell>
            <TableCell className="border border-black">Product</TableCell>
            <TableCell className="border border-black">Loading Station/Pump</TableCell>
            <TableCell className="border border-black">Qty (CH1)</TableCell>
            <TableCell className="border border-black">Qty (CH2)</TableCell>
            <TableCell className="border border-black">Total</TableCell>
          </TableRow>
          <TableRow className="border-none">
            <TableCell className="border border-black">{formatDate(record?.loading.sheetId.createdAt!)}</TableCell>
            <TableCell className="border border-black">{record?.loading.sheetId.product}</TableCell>
            <TableCell className="border border-black">{record?.loading.sheetId.bccAuthorizedOfficer.orderId.loadingLocationName}</TableCell>
            <TableCell className="border border-black text-right">{ch1FullLoadAddqty}</TableCell>
            <TableCell className="border border-black text-right">{ch2FullLoadAddqty}</TableCell>
            <TableCell className="border border-black text-right">{totalLoadedQtyByDip == 0 ? "CN*" : totalLoadedQtyByDip}</TableCell>
          </TableRow>
          {record?.addition?.length && record?.addition?.length > 0 ? record.addition.map((record, index) => (
            <TableRow key={index} className="border border-black">
              <TableCell className="border border-black">{formatDate(record.sheetId?.createdAt) || formatDate(record.at)}</TableCell>
              <TableCell className="border border-black">{record.sheetId?.product}</TableCell>
              <TableCell className="border border-black">{record.sheetId?.bccAuthorizedOfficer.orderId.loadingLocationName}</TableCell>
              <TableCell className="border border-black text-right">{record.sheetId?.chamberwiseDipListAfter.find(chambers => (chambers.chamberId == "Chamber-1"))?.qty}</TableCell>
              <TableCell className="border border-black text-right">{record.sheetId?.chamberwiseDipListAfter.find(chambers => (chambers.chamberId == "Chamber-2"))?.qty}</TableCell>
              <TableCell className="border border-black text-right">{record.sheetId?.totalLoadQuantityByDip == 0 ? "CN*" : record.sheetId?.totalLoadQuantityByDip || record.quantity}</TableCell>
            </TableRow>
          )) : ""}
        </TableBody>
      </Table>
      <div className="flex justify-between items-end w-full">
        <div className="min-w-5 text-center">
          Driver
        </div>
        <div className="min-w-5 text-center">
        </div>
        <div className="min-w-5 text-center">
          Superviser
        </div>
        <div className="min-w-5 text-center">
          <Image
            src="/assets/sahil-sign.png"
            alt="Sahil's signature"
            width={90}
            height={30}
          />
        </div>
        <div className="min-w-5 text-center">
          Verified by
        </div>
        <div className="min-w-5 text-center">

        </div>
        <div className="min-w-5 text-center">
          Deducted by
        </div>
        <div className="min-w-5 text-center">

        </div>
      </div>
    </div >
  );
};

export default FinalPrint