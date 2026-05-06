import { useSearchParams } from 'next/navigation';

interface QueryType {
    vehicleNo: string;
}

const page = () => {
    const searchParams = useSearchParams();
    const rawQuery = Object.fromEntries(searchParams.entries()) as Record<string, string | undefined>;
    const query: QueryType = {
        vehicleNo: rawQuery.vehicleNo ?
            rawQuery.vehicleNo : "",
    };

    return (
        <div>page</div>
    )
}

export default page