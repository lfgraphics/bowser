"use client"
import { TankersTrip } from '@/types'
import { fetchLoadedButUnloadedTrips } from '@/utils/transApp'
import { useEffect, useState, useContext } from 'react'
import { TransAppContext } from "../layout";
import LoadVehicleTracker from '@/components/UnloadingTracker'
import Loading from '@/app/loading';
import { useSearchParams } from 'next/navigation';

type QueryType = {
  actionType: "unload" | "update" | "report" | undefined;
  tripId: string;
}

const UnloadingTracker = () => {
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState<boolean>(true)
  const { user } = useContext(TransAppContext);
  const [data, setData] = useState<TankersTrip[]>([])

  // parse and validate search params into QueryType
  const rawQuery = Object.fromEntries(searchParams.entries()) as Record<string, string | undefined>;
  const actionRaw = rawQuery.actionType;
  const actionType = (actionRaw === "unload" ||
    actionRaw === "update" ||
    actionRaw === "report")
    ? actionRaw as QueryType["actionType"]
    : undefined;
  const query: QueryType = {
    actionType,
    tripId: rawQuery.tripId ?? ""
  };


  useEffect(() => {
    if (!user) return
    fetchData()
    // eslint-disable-next-line
  }, [user])

  const fetchData = async () => {
    if (!user) return
    try {
      setLoading(true)
      let result = await fetchLoadedButUnloadedTrips(user._id)
      // Ensure result is an array
      setData(Array.isArray(result) ? result : [result])
      console.log(result)
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
          {!loading && data && <LoadVehicleTracker query={query} tripsData={data} />}
        </div>
      </div>
    </>
  )
}

export default UnloadingTracker;
