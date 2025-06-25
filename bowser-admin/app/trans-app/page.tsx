"use client"
import FilterableTable, { ColumnConfig } from '@/components/FilterableTable'
import ImageFromBufferObject from '@/components/ImageFromBuffer'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import React, { useContext } from 'react'
import { TransAppContext } from "./layout"; 

type Row = {
  sn: string
  vehicle: string
}

export default function Page() {
  const { user, photo } = useContext(TransAppContext);

  const columns: ColumnConfig<Row>[] = [
    { key: 'sn', label: 'SN', filterable: false, sortable: false },
    { key: 'vehicle', label: 'Vehicle', filterable: true, sortable: true },
  ];

  const data: Row[] = user?.vehicles.map((vehicle, index) => ({
    sn: (index + 1).toString(),
    vehicle: vehicle
  } as Row)) || [];

  return (
    <>
      <div className='ml-4 mt-4 flex flex-col'>
        <Card className='w-fit'>
          <CardContent>
            <CardHeader className='font-semibold'>User Profile</CardHeader>
            <ImageFromBufferObject bufferObject={photo} className='hover:bg-yellow-100 rounded-full w-20 h-20' />
            <p><strong>Name: </strong>{user?.name}</p>
            <p><strong>Vehicles: </strong>{user?.vehicles.length}</p>
          </CardContent>
        </Card>
        {data && <FilterableTable data={data} columns={columns}></FilterableTable>}
      </div>
    </>
  )
}
