"use client"
import { TankersTrip } from '@/types'
import { fetchUnloadedButPlanned } from '@/utils/transApp'
import { useEffect, useState, useContext } from 'react'
import { TransAppContext } from "../layout";
import UnloadedPlannedVehicleTracker from '@/components/LoadingTracker'
import Loading from '@/app/loading'
import { useSearchParams } from 'next/navigation';

type QueryType = {
  actionType: "loaded" | "destinationChange" | "update" | "report" | undefined;
  tripId: string;
  destination: string;
  destinationName: string;
  notificationId: string;
  orderedBy: string;
}

const LoadingTracker = () => {
  const searchParams = useSearchParams();

  // parse and validate search params into QueryType
  const rawQuery = Object.fromEntries(searchParams.entries()) as Record<string, string | undefined>;
  const actionRaw = rawQuery.actionType;
  console.log("Action Raw:", actionRaw);
  const actionType = (actionRaw === "loaded" ||
    actionRaw === "destinationChange" ||
    actionRaw === "update" ||
    actionRaw === "report")
    ? actionRaw as QueryType["actionType"]
    : undefined;
  const query: QueryType = {
    actionType,
    tripId: rawQuery.tripId ?? "",
    destination: rawQuery.destination ?? "",
    destinationName: rawQuery.destinationName ?? "",
    notificationId: rawQuery.notificationId ?? "",
    orderedBy: rawQuery.orderedBy ?? ""
  };

  const [loading, setLoading] = useState<boolean>(true)
  const { user } = useContext(TransAppContext);
  const [data, setData] = useState<TankersTrip[]>([])

  useEffect(() => {
    if (!user) return
    fetchData()
    // eslint-disable-next-line
  }, [user])

  const fetchData = async () => {
    if (!user) return
    try {
      setLoading(true)
      let result = await fetchUnloadedButPlanned(user._id)
      // Ensure result is an array
      setData(Array.isArray(result) ? result : [result])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <Loading />}
      <div className="flex flex-col gap-4">
        <div className="actions">
          {!loading && data && user && <UnloadedPlannedVehicleTracker query={query} tripsData={data} user={user} />}
        </div>
      </div>
    </>
  )
}

export default LoadingTracker;
