import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CreateCustomer from '@/components/transappComponents/CreateCustomer'
import UpdateCustomer from '@/components/transappComponents/UpdateCustomer'

export default function page() {
    return (
        <div className='container mx-auto p-4'>
            <Tabs defaultValue="create">
                <TabsList >
                    <TabsTrigger value="create">Create Customer</TabsTrigger>
                    <TabsTrigger value="update">Update Customer</TabsTrigger>
                </TabsList>
                <TabsContent value="create">
                    <CreateCustomer />
                </TabsContent>
                <TabsContent value="update">
                    <UpdateCustomer />
                </TabsContent>
            </Tabs>
        </div>
    )
}
