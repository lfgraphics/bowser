"use client"
import Loading from '@/app/loading';
import TripCalculationModal from '@/components/exclusive/TripCalculationModal';
import Modal from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BASE_URL } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { WholeTripSheet } from '@/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

const SettlementPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const [id, setId] = useState<string>("");
  useEffect(() => {
    (async () => {
      const { id } = await params;
      setId(id);
    })();
  }, [params]);

  const [tripSheet, setTripSheet] = useState<WholeTripSheet | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkModalVisible, setCheckModalVisible] = useState<boolean>(true);
  const [record, setRecord] = useState<WholeTripSheet>();
  const [error, setError] = useState<string | null>(null);
  const [chamberwiseDipList, setChamberwiseDipList] = useState<
    { chamberId: string; levelHeight: number }[]
  >([]);
  const [pumpReading, setPumpReading] = useState<string>()
  const [odometer, setOdometer] = useState<number>()
  const [dateTime, setDateTime] = useState<string>()

  // manual Entries for final calculation
  const [unload, setUnload] = useState<string>()
  const [tollTax, setTollTax] = useState<number>(0)
  const [borderOtherExp, setBorderOtherExp] = useState<number>()
  const [hsdPerKm, setHsdPerKm] = useState<string>('15')
  const [filledByDriver, setFilledByDriver] = useState<string>()
  const [hsdRateForDeduction, setHsdRateForDeduction] = useState<string>('0');
  const [saleryDays, setSaleryDays] = useState<number>(4);
  const [foodingDays, setFoodingDays] = useState<number>(4);
  const [rewardTrips, setRewardTrips] = useState<number>(1);
  const [foodingRate, setFoodingRate] = useState<number>(200);
  const [saleryRate, setSaleryRate] = useState<number>(500);
  const [rewardRate, setRewardRate] = useState<number>(300);
  const [constantfoodingRate, setconstantFoodingRate] = useState<number>(200);
  const [constantsaleryRate, setconstantSaleryRate] = useState<number>(500);
  const [constantrewardRate, setconstantRewardRate] = useState<number>(300);
  const [updateNeeded, setUpdateNeeded] = useState<boolean>(false);
  const [foodingTotal, setFoodingTotal] = useState<number>(0);
  const [saleryTotal, setSaleryTotal] = useState<number>(0);
  const [rewardTotal, setRewardTotal] = useState<number>(0);

  useEffect(() => {
    setFoodingTotal(foodingDays * foodingRate);
    setSaleryTotal(saleryDays * saleryRate);
    setRewardTotal(rewardTrips * rewardRate);
  }, [foodingDays, foodingRate, saleryDays, saleryRate, rewardTrips, rewardRate]);

  useEffect(() => {
    if (saleryRate !== constantsaleryRate || foodingRate !== constantfoodingRate || rewardRate !== constantrewardRate) {
      setUpdateNeeded(true);
    }
  }, [foodingRate, saleryRate, rewardRate])

  const checkAuth = () => {
    const authenticated = isAuthenticated();
    if (!authenticated) {
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    checkAuth();
    const fetchRate = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/salery-calc`);
        const data = response.data;
        console.log(data)
        setconstantFoodingRate(data.saleryCalc.foodingRate);
        setconstantRewardRate(data.saleryCalc.rewardRate);
        setconstantSaleryRate(data.saleryCalc.saleryRate)
      } catch (error) {
        console.error("Error fetching rate:", error);
        setError("Error fetching rate data");
      } finally {
        setLoading(false);
      }
    }
    fetchRate();
  }, []);

  useEffect(() => {
    const fetchTripSheet = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${BASE_URL}/tripsheet/${id}`
        );
        const data: WholeTripSheet = response.data;
        setTripSheet(data);

        if (data.bowser && data.loading.sheetId.chamberwiseDipListAfter) {
          setChamberwiseDipList(
            data.loading.sheetId.chamberwiseDipListAfter.map((dip) => ({
              chamberId: dip.chamberId,
              levelHeight: 0,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching TripSheet:", error);
        setError("Error fetching TripSheet data");
      } finally {
        setLoading(false);
      }
    };

    fetchTripSheet();
  }, [id]);

  const updateCalcRate = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${BASE_URL}/salery-calc`,
        {
          foodingRate: foodingRate,
          rewardRate: rewardRate,
          saleryRate: saleryRate
        }
      );
      const data = response.data;
      console.log(data)
    } catch (error) {
      console.error("Error updating rate:", error);
      setError("Error updating rate data");
    } finally {
      setLoading(false);
      setUpdateNeeded(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (updateNeeded) {
      await updateCalcRate();
    }

    setLoading(true);
    setError(null);

    const storedUserJson = localStorage.getItem("adminUser");
    let userDetails = { id: "", name: "", phoneNumber: "" };
    if (storedUserJson) {
      const storedUser = JSON.parse(storedUserJson);
      userDetails = {
        id: storedUser.userId || "",
        name: storedUser.name || "",
        phoneNumber: storedUser.phoneNumber || "",
      };
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/tripsheet/settle/${id}`,
        {
          chamberwiseDipList,
          pumpReading: Number(pumpReading),
          odometer: Number(odometer),
          dateTime,
          userDetails,
          extras: {
            filledByDriver: Number(filledByDriver),
            saleryTotal,
            foodingTotal,
            rewardTotal,
            hsdRateFor: Number(hsdRateForDeduction),
            tollTax: Number(tollTax),
            borderOtherExp: Number(borderOtherExp),
            unload: Number(unload),
            hsdPerKm: Number(hsdPerKm),
          },
        }
      );
      console.log(response);
      if (response.status === 200) {
        alert("Settlement submitted successfully!");
        handlePrint();
      }
    } catch (error) {
      console.error("Error submitting settlement:", error);
      setError("Error submitting settlement");
    } finally {
      setLoading(false);
    }
  };

  const checkSettelment = async (e: React.FormEvent) => {
    e.preventDefault();

    // if (updateNeeded) {
    //   await updateCalcRate();
    // }

    setLoading(true);
    setError(null);

    const storedUserJson = localStorage.getItem("adminUser");
    let userDetails = { id: "", name: "", phoneNumber: "" };
    if (storedUserJson) {
      const storedUser = JSON.parse(storedUserJson);
      userDetails = {
        id: storedUser.userId || "",
        name: storedUser.name || "",
        phoneNumber: storedUser.phoneNumber || "",
      };
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/tripsheet/check-settelment/${id}`,
        {
          chamberwiseDipList,
          pumpReading: Number(pumpReading),
          odometer: Number(odometer),
          dateTime,
          userDetails,
          extras: {
            filledByDriver: Number(filledByDriver),
            saleryTotal,
            foodingTotal,
            rewardTotal,
            hsdRateFor: Number(hsdRateForDeduction),
            tollTax: Number(tollTax),
            borderOtherExp: Number(borderOtherExp),
            unload: Number(unload),
            hsdPerKm: Number(hsdPerKm),
          },
        }
      );
      console.log(response);
      if (response.status === 200) {
        // alert("Settlement submitted successfully!");
        setCheckModalVisible(true);
        let data = response.data.tripsheet;
        console.log(data)
        setRecord(data)
      }
    } catch (error) {
      console.error("Error submitting settlement:", error);
      setError("Error submitting settlement");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printURL = `${window.location.origin}/tripsheets/settle/print/${id}`; // Your print route
    const newWindow = window.open(printURL, "_blank");
    newWindow?.focus();

    setTimeout(() => {
      newWindow?.print();
    }, 3000);
  };

  return (
    <>
      <div className="flex flex-col gap-3 pt-8">
        {loading && <Loading />}
        <h1>Settlement/closeing of TripSheet ID: {tripSheet?.tripSheetId}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <h2>Chamberwise Dip List on return</h2>
          {chamberwiseDipList.map((dip, index) => (
            <div key={dip.chamberId}>
              <Label htmlFor={`${dip.chamberId}`}>{dip.chamberId}</Label>
              <Input
                id={`${dip.chamberId}`}
                type="string"
                placeholder="Level Height in cm"
                value={dip.levelHeight}
                onChange={(e) => {
                  const newLevelHeight = Number(e.target.value);
                  setChamberwiseDipList((prev) => {
                    const updatedDipList = [...prev];
                    updatedDipList[index].levelHeight = newLevelHeight;
                    return updatedDipList;
                  });
                }}
                required
              />
            </div>
          ))}
          <Label htmlFor={`pumpEndReading`}>Bowser pump end reading</Label>
          <Input
            id={`pumpEndReading`}
            type="string"
            placeholder="Pump End reading"
            value={pumpReading}
            onChange={(e) => {
              setPumpReading(e.target.value);
            }}
            required
          />
          <Label htmlFor={`odoMeterReading`}>Bowser odometer reading</Label>
          <Input
            id={`odoMeterReading`}
            type="string"
            placeholder="Odometer End reading"
            value={odometer}
            onChange={(e) => {
              setOdometer(Number(e.target.value));
            }}
            required
          />
          <Label htmlFor={`pumpEndReading`}>Settlment Date, Time</Label>
          <Input
            id={`pumpEndReading`}
            type="datetime-local"
            placeholder="end reading"
            value={String(dateTime)}
            onChange={(e) => {
              setDateTime(e.target.value);
            }}
            required
          />
          <Separator className="my-7" />
          <h3 className="font-semibold text-xl">Distripbution Cost Details</h3>
          <Label htmlFor={`unload`}>Unload (Return Qty)</Label>
          <Input
            id={`unload`}
            type="string"
            placeholder="Unload"
            value={unload}
            onChange={(e) => {
              setUnload(e.target.value);
            }}
            required
          />
          <Label htmlFor={`hsdPerKm`}>HSD @ Km/Lt.</Label>
          <Input
            id={`hsdPerKm`}
            type="string"
            placeholder="HSD Per Km"
            value={hsdPerKm}
            onChange={(e) => {
              setHsdPerKm(e.target.value);
            }}
            required
          />
          <Separator />
          <Label htmlFor={`filledByDriver`}>Filled By Driver</Label>
          <Input
            id={`filledByDriver`}
            type="text"
            placeholder="Filled By Driver"
            value={filledByDriver}
            onChange={(e) => {
              setFilledByDriver(e.target.value);
            }}
            required
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Purpose</TableHead>
                <TableHead className="text-left">Count/Days</TableHead>
                <TableHead className="text-left">Per Count/Day</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {/* Fooding Row */}
              <TableRow>
                <TableCell className="font-medium">Fooding</TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    value={foodingDays}
                    onChange={(e) => setFoodingDays(Number(e.target.value))}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    value={foodingRate}
                    onChange={(e) => setFoodingRate(Number(e.target.value))}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell className="font-semibold text-right">
                  {foodingTotal}
                </TableCell>
              </TableRow>

              {/* Salary Row */}
              <TableRow>
                <TableCell className="font-medium">Salary</TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    value={saleryDays}
                    onChange={(e) => setSaleryDays(Number(e.target.value))}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    value={saleryRate}
                    onChange={(e) => setSaleryRate(Number(e.target.value))}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell className="font-semibold text-right">
                  {saleryTotal}
                </TableCell>
              </TableRow>

              {/* Reward Trips Row */}
              <TableRow>
                <TableCell className="font-medium">Reward Trips</TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    value={rewardTrips}
                    onChange={(e) => setRewardTrips(Number(e.target.value))}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    value={rewardRate}
                    onChange={(e) => setRewardRate(Number(e.target.value))}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell className="font-semibold text-right">
                  {rewardTotal}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Label htmlFor={`hsdRateFor`}>HSD Rate For Deduction</Label>
          <Input
            id={`hsdRateFor`}
            type="text"
            placeholder="HSD Rate For Deduction"
            value={tripSheet?.hsdRate}
            onChange={(e) => {
              setHsdRateForDeduction(e.target.value);
            }}
            required
          />
          <Label htmlFor={`tollTax`}>Toll Tax</Label>
          <Input
            id={`tollTax`}
            type="string"
            placeholder="Toll Tax"
            value={tollTax}
            onChange={(e) => {
              setTollTax(Number(e.target.value));
            }}
            required
          />
          <Label htmlFor={`borderOtherExp`}>Border Other Exp</Label>
          <Input
            id={`borderOtherExp`}
            type="string"
            placeholder="Border Other Exp"
            value={borderOtherExp}
            onChange={(e) => {
              setBorderOtherExp(Number(e.target.value));
            }}
            required
          />
          <Button type="submit">Submit Settlement</Button>
        </form>
        <Button type="button" onClick={checkSettelment}>Check Calculation</Button>
        {error && <div>{error}</div>}
      </div>
      {checkModalVisible && record &&
        <Modal isOpen={checkModalVisible} onClose={() => setCheckModalVisible(false)}>
          <TripCalculationModal record={record} />
        </Modal>
      }
    </>
  );
};

export default SettlementPage;