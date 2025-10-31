"use client"
import { TankersTrip } from '@/types'
import { fetchUnloadedButNotPlanned } from '@/utils/transApp'
import { useEffect, useState, useContext } from 'react'
import { TransAppContext } from "../layout";
import Loading from '@/app/loading'
import UnloadedUnplannedVehicleTracker from '@/components/LoadingPlanner'
import { useSearchParams } from 'next/navigation';

type QueryType = {
  tripId: string;
}

const UnloadingTracker = () => {
  const searchParams = useSearchParams();

  // parse and validate search params into QueryType
  const rawQuery = Object.fromEntries(searchParams.entries()) as Record<string, string | undefined>;
  const query: QueryType = {
    tripId: rawQuery.tripId ?? ""
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
      let result = await fetchUnloadedButNotPlanned(user._id)
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
          {!loading && data && <UnloadedUnplannedVehicleTracker tripsData={data} user={user} query={query} />}
        </div>
      </div>
    </>
  )
}

export default UnloadingTracker;
