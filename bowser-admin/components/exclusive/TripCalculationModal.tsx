"use client"
import React, { useEffect, useState } from "react";
import { Table, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { WholeTripSheet } from "@/types";
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
  const [totalLoadQty, setTotalLoadQty] = useState<number>(
    Number(record?.totalLoadQuantityBySlip?.toFixed(2)) || 0
  );
  const [totalLoadedQty, setTotalLoadedQty] = useState<number>(
    ch1FullLoadTotalqty + ch2FullLoadTotalqty
  );
  const [totalLoadedQtyByDip, setTotalLoadedQtyByDip] = useState<number>(
    Number(record?.tempLoadByDip?.toFixed(2)) || 0
  );
  // heading and slip total on load
  const [fullLoadQtyBySlip, setFullLoadQtyBySlip] = useState<number>(
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
    Number(((totalLoadedQty + addition) - unload).toFixed(2))
  );
  // HSD consumption, short excess
  const [hsdPerKm, setHsdPerKm] = useState<number>(
    Number((record.settelment?.details.extras?.hsdPerKm || 0).toFixed(2))
  );
  const [hsdConsumption, setHsdConsumption] = useState<number>(
    distance > 0 && hsdPerKm > 0 ? Math.round(distance / hsdPerKm) : 0
  );
  const [shortExcess, setShortExcess] = useState<number>(
    totalClosingQty - totalOpeningQty
  );
  //pump consumtion & sale as per load
  const [pumpConsumption, setPumpConsumption] = useState<number>(
    machineSaleQty > 0 ? Math.round((1 * machineSaleQty) / 1000) : 0
  );
  const [saleAsPerLoad, setSaleAsPerLoad] = useState<number>(machineSaleQty);
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
  const [shortOrExcessAsPerRecord, setShortOrExcessAsPerRecord] =
    useState<number>(saleAsPerDriver - saleAsPerLoad);

  const [saleryDays, setSaleryDays] = useState<number>(
    record.settelment?.details.extras?.saleryDays || 0
  );
  const [foodingDays, setFoodingDays] = useState<number>(
    record.settelment?.details.extras?.foodingDays || 0
  );

  const [hsdRateFor, setHsdRateFor] = useState<number>(
    record.hsdRate || record.settelment?.details.extras.hsdRateFor || 0
  );
  const [tollTax, setTollTax] = useState<number>(
    record.settelment?.details.extras?.tollTax || 0
  );
  const [driverFooding, setDriverFooding] = useState<number>(foodingDays * 200);
  const [driverSalary, setDriverSalary] = useState<number>(saleryDays * 500);
  const [fuelingCost, setFuelingCost] = useState<number>(
    Math.round(hsdRateFor * filledByDriver)
  );
  const [borderOtherExp, setBorderOtherExp] = useState<number>(
    record.settelment?.details.extras?.borderOtherExp || 0
  );
  const [reward, setReward] = useState<number>(
    (record.settelment?.details.extras?.rewardTrips || 0) * 300
  );
  // =IF(F14<-ROUND(F11*5%,2),-F14,0)*K16
  const [deductableExcessFuelingValue, setDeductableExcessFuelingValue] =
    useState<number>(
      (shortOrExcessByDriver < -parseFloat((hsdConsumption * 0.05).toFixed(2))
        ? -shortOrExcessByDriver
        : 0) * hsdRateFor
    );
  console.log(
    "short or excess by driver: ",
    shortOrExcessByDriver,
    "hsd consumption: ",
    hsdConsumption,
    "formula",
    (hsdConsumption * 0.05).toFixed(2),
    "hsd rate for consumption: ",
    hsdRateFor
  );
  // =IF(K14<-5,-K14,0)*K16
  const [deductableShortSale, setDeductableShortSale] = useState<number>(
    (shortOrExcessAsPerRecord < -5 ? -shortOrExcessAsPerRecord : 0) * hsdRateFor
  );
  const [totalDeduction, setTotalDeduction] = useState<number>(
    Number((deductableExcessFuelingValue + deductableShortSale).toFixed(2))
  );
  const [totalDistributionCost, setTotalDistributionCost] = useState<number>(
    tollTax +
      driverFooding +
      driverSalary +
      fuelingCost +
      borderOtherExp +
      reward
  );
  const [distributionCostPerLtr, setDistributionCostPerLtr] = useState<string>(
    (totalDistributionCost / saleAsPerDriver).toFixed(2)
  );

  return (
    <div id="printable-table">
      <Table>
        <TableBody className="border-gray-400 border">
          <TableRow className="font-semibold">
            <TableCell className="border-gray-400 border text-base text-left">
              Vehicle No.
            </TableCell>
            <TableCell
              className="border-gray-400 border text-base text-left"
              colSpan={2}
            >
              {bowser}
            </TableCell>
            <TableCell
              className="border-gray-400 border text-base text-center"
              colSpan={2}
            >
              Opening
            </TableCell>
            <TableCell
              className="border-gray-400 border text-base text-center"
              rowSpan={2}
            >
              Qty to be Return
            </TableCell>
            <TableCell
              className="border-gray-400 border text-base text-center"
              colSpan={4}
            >
              Full Load
            </TableCell>
          </TableRow>
          <TableRow className="font-semibold">
            <TableCell className="border-gray-400 border text-base text-left">
              Chamber
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              CM
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              QTY
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              CM
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              QTY
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              CM
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              Add QTY
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              Total QTY
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              Dip QTY
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="border-gray-400 border text-base text-left">
              CH-1
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch1Cm}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch1qty}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch1OpeningCm}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch1Openingqty} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch1QtyToBeReturn} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch1FullLoadAddCm}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch1FullLoadAddqty} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch1FullLoadTotalqty} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch1FullLoadDipqty == 0 ? "CN" : ch1FullLoadDipqty + " Lt."}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="border-gray-400 border text-base text-left">
              CH-2
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch2Cm}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch2qty}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch2OpeningCm}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch2Openingqty} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch2QtyToBeReturn} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch2FullLoadAddCm}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch2FullLoadAddqty} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch2FullLoadTotalqty} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {ch2FullLoadTotalqtyByDip == 0
                ? "CN"
                : ch2FullLoadTotalqtyByDip + " Lt."}
            </TableCell>
          </TableRow>
          <TableRow className="font-semibold">
            <TableCell className="border-gray-400 border text-base text-left">
              Total
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalClosingCm}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalClosingQty} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalOpeningCm}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalOpeningQty} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalQtyToBeReturned} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalLoadHeight}
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalLoadQty} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalLoadedQty} Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalLoadedQtyByDip} Lt.
            </TableCell>
          </TableRow>
          <TableRow className="font-semibold">
            <TableCell className="border-gray-400 border font-semibold text-base text-left">
              Machine Reading
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              Lt.
            </TableCell>
            <TableCell
              className="border-gray-400 border text-base text-left"
              colSpan={2}
            >
              HSD Consumption
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              KM
            </TableCell>
            <TableCell
              className="border-gray-400 border text-base text-left"
              colSpan={4}
            >
              Load Qty
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalLoadedQty}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="border-gray-400 border font-semibold text-base text-left">
              Opening
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {openingPumpReading}
            </TableCell>
            <TableCell
              className="border-gray-400 border font-semibold text-base text-left"
              colSpan={2}
            >
              Opening
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {openingOdoMeter}
            </TableCell>
            <TableCell
              className="border-gray-400 border font-semibold text-base text-left"
              colSpan={4}
            >
              Add Qty
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {addition}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="border-gray-400 border font-semibold text-base text-left">
              Closing
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {closingPumpReading}
            </TableCell>
            <TableCell
              className="border-gray-400 border font-semibold text-base text-left"
              colSpan={2}
            >
              Closing
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {closingOdoMeter}
            </TableCell>
            <TableCell
              className="border-gray-400 border font-semibold text-base text-left"
              colSpan={4}
            >
              Return Qty
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {unload}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="border-gray-400 border font-semibold text-base text-left">
              Machine Sale Qty
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {machineSaleQty}
            </TableCell>
            <TableCell
              className="border-gray-400 border font-semibold text-base text-left"
              colSpan={2}
            >
              Return KM
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {distance} Km
            </TableCell>
            <TableCell
              className="border-gray-400 border font-semibold text-base text-left"
              colSpan={4}
            >
              Net Load Qty
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {netLoadQty} Lt.
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={2} rowSpan={4}></TableCell>
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              HSD @{hsdPerKm}KM/Lt.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {hsdConsumption}
            </TableCell>
            <TableCell
              className="border-gray-400 border font-semibold text-base text-left"
              colSpan={4}
            >
              Qty. (Short)/Excess (Bal. Dip)
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {shortExcess}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={2}
              className="border-gray-400 border font-semibold text-base text-left"
            >
              Pump Consum. Qty
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {pumpConsumption}
            </TableCell>
            <TableCell
              colSpan={4}
              className="border-gray-400 border text-base text-left"
            >
              Sale as per Load
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {saleAsPerLoad}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={2}
              className="border-gray-400 border font-semibold text-base text-left"
            >
              Filled by Driver
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {filledByDriver}
            </TableCell>
            <TableCell
              colSpan={4}
              className="border-gray-400 border text-base text-left"
            >
              Sale as per Driver
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {saleAsPerDriver}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={2}
              className="border-gray-400 border font-semibold text-base text-left"
            >
              Short/(Excess)
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {shortOrExcessByDriver.toFixed(2)}
            </TableCell>
            <TableCell
              colSpan={4}
              className="border-gray-400 border text-base text-left"
            >
              Excess/(Short) Sales
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {shortOrExcessAsPerRecord.toFixed(2)}
            </TableCell>
          </TableRow>
          <TableRow className="font-semibold">
            <TableCell
              colSpan={3}
              className="border-gray-400 border text-base text-left"
            >
              Distribution Cost
            </TableCell>
            <TableCell
              colSpan={4}
              className="border-gray-400 border text-base text-left"
            ></TableCell>
            <TableCell
              colSpan={3}
              className="border-gray-400 border font-semibold text-base text-center"
            >
              Deduction Details
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Toll Tax
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {tollTax}
            </TableCell>
            <TableCell
              colSpan={4}
              className="border-gray-400 border text-base text-left"
            ></TableCell>
            <TableCell
              colSpan={2}
              className="border-gray-400 border font-semibold text-base text-center"
            >
              HSD Rate For Deduction
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {hsdRateFor} /Lt.
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Driver Fooding
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {driverFooding}
            </TableCell>
            <TableCell
              colSpan={4}
              className="border-gray-400 border text-base text-left"
            ></TableCell>
            <TableCell
              colSpan={2}
              rowSpan={3}
              className="border-gray-400 border font-semibold text-base text-left"
            >
              Deductable Excess Fueling Value
            </TableCell>
            <TableCell
              rowSpan={3}
              className="border-gray-400 border text-base text-left"
            >
              {deductableExcessFuelingValue}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Driver Salary
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {driverSalary}
            </TableCell>
            <TableCell
              colSpan={4}
              className="border-gray-400 border text-base text-left"
            ></TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Fueling Cost
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {fuelingCost}
            </TableCell>
            <TableCell
              colSpan={4}
              className="border-gray-400 border text-base text-left"
            ></TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Border Other Exp
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {borderOtherExp}
            </TableCell>
            <TableCell
              colSpan={4}
              className="border-gray-400 border text-base text-left"
            ></TableCell>
            <TableCell
              colSpan={2}
              rowSpan={3}
              className="border-gray-400 border font-semibold text-base text-left"
            >
              Deductable Short Sale Value
            </TableCell>
            <TableCell
              rowSpan={3}
              className="border-gray-400 border text-base text-left"
            >
              {deductableShortSale}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Reward
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {reward}
            </TableCell>
            <TableCell
              colSpan={7}
              className="border-gray-400 border text-base text-left"
            ></TableCell>
          </TableRow>
          <TableRow className="font-semibold">
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Total Distribution Cost
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalDistributionCost}
            </TableCell>
            <TableCell
              colSpan={7}
              className="border-gray-400 border text-base text-left"
            ></TableCell>
          </TableRow>
          <TableRow className="font-semibold">
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Distribution Cost per Ltr.
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {distributionCostPerLtr}
            </TableCell>
            <TableCell
              colSpan={4}
              className="border-gray-400 border text-base text-left"
            ></TableCell>
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Total Deduction Amount
            </TableCell>
            <TableCell className="border-gray-400 border text-base text-left">
              {totalDeduction}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={10}></TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Driver
            </TableCell>
            <TableCell colSpan={3}>
              <span className="relative flex gap-3">
                Supervisor{" "}
                <Image
                  src="/assets/sahil-sign.png"
                  alt="Sahil's signature"
                  width={120}
                  height={40}
                  className="-bottom-3 left-20 absolute"
                />
              </span>
            </TableCell>
            <TableCell
              colSpan={2}
              className="border-gray-400 border text-base text-left"
            >
              Verified by
            </TableCell>
            <TableCell
              colSpan={3}
              className="border-gray-400 border text-base text-left"
            >
              Deducted by
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default FinalPrint