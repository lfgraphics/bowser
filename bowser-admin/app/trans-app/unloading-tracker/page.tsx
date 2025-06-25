"use client"
import { isAuthenticated } from '@/lib/auth'
import { TankersTrip, TransAppUser } from '@/types'
import { fetchLoadedButUnloadedTrips } from '@/utils/transApp'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import FilterableTable, { ColumnConfig } from '@/components/FilterableTable'

function flattenKeys(
  obj: any,
  prefix = ""
): Array<{ key: string; label: string; render?: (row: any) => any }> {
  let keys: Array<{ key: string; label: string; render?: (row: any) => any }> = [];
  for (const k in obj) {
    const value = obj[k];
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      // Recursively flatten nested objects
      keys.push(
        ...flattenKeys(value, fullKey)
      );
    } else {
      keys.push({
        key: fullKey,
        label: fullKey,
        render: (row: any) => {
          // Traverse the path to get the value
          return fullKey.split('.').reduce((acc, curr) => acc?.[curr], row);
        }
      });
    }
  }
  return keys;
}

const UnloadingTracker = () => {
  const router = useRouter()
  const [user, setUser] = useState<TransAppUser>()
  const [data, setData] = useState<TankersTrip[]>([])

  useEffect(() => {
    if (isAuthenticated()) {
      const storedUser = JSON.parse(localStorage.getItem('adminUser')!);
      setUser(storedUser);
    } else {
      router.push('/login');
    }
  }, [])

  useEffect(() => {
    if (!user) return
    fetchData()
    // eslint-disable-next-line
  }, [user])

  const fetchData = async () => {
    if (!user) return
    let result = await fetchLoadedButUnloadedTrips(user._id)
    // Ensure result is an array
    setData(Array.isArray(result) ? result : [result])
    console.log(result)
  }

  const columns: ColumnConfig<TankersTrip>[] = useMemo(() => {
    if (!data || data.length === 0) return []
    return flattenKeys(data[0])
  }, [data])

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Unloading Tracker</h2>
      {/* <FilterableTable<TankersTrip> data={data} columns={columns} /> */}
    </div>
  )
}

export default UnloadingTracker;
