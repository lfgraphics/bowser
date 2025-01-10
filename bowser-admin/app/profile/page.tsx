import Profile from "@/components/pages/profile"
import { BASE_URL } from "@/lib/api";
import { Metadata } from "next";

export async function generateMetadata({ params, searchParams }: { params: Record<string, any>; searchParams: Record<string, any> }): Promise<Metadata> {
    const dynamicUrl = new URL(`${BASE_URL}${params.slug ? `/${params.slug}` : ""}`);

    if (searchParams && typeof searchParams === "object") {
        Object.entries(searchParams).forEach(([key, value]) => {
            dynamicUrl.searchParams.append(key, value as string);
        });
    }

    return {
        metadataBase: new URL(BASE_URL!),
        title: "Profile | ITPL DCS",
        description: "Manage your profile",
        openGraph: {
            images: ["https://avatar.iran.liara.run/public/boy"],
            url: dynamicUrl.toString()
        },
    };
}

const page = () => {
    return <Profile />
}
export default page;