import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CreateRoute from '@/components/transappComponents/CreateRoute'
import UpdateRoute from '@/components/transappComponents/UpdateRoute'

export default function page() {
    return (
        <div className='container mx-auto p-4'>
            <Tabs defaultValue="create">
                <TabsList >
                    <TabsTrigger value="create">Create Route</TabsTrigger>
                    <TabsTrigger value="update">Update Route</TabsTrigger>
                </TabsList>
                <TabsContent value="create">
                    <CreateRoute />
                </TabsContent>
                <TabsContent value="update">
                    <UpdateRoute />
                </TabsContent>
            </Tabs>
        </div>
    )
}
