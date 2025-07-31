"use client"
import { TankersTrip } from '@/types'
import { fetchLoadedButUnloadedTrips } from '@/utils/transApp'
import React, { useEffect, useState, useContext } from 'react'
import { TransAppContext } from "../layout";
import LoadVehicleTracker from '@/components/UnloadingTracker'
import Loading from '@/app/loading';

const UnloadingTracker = () => {
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
          {!loading && data && <LoadVehicleTracker tripsData={data} />}
        </div>
      </div>
    </>
  )
}

export default UnloadingTracker;
