import { NextResponse } from 'next/server'
import { createTallyPostableXML } from '@/utils/post' // server-safe

export async function POST(req: Request) {
    const { record, variables } = await req.json();
    const xml = await createTallyPostableXML(record, variables);
    return NextResponse.json({ xml });
}
export async function GET(req: Request) {
    console.log("GET request received")
    return NextResponse.json({ message: "GET request received" });
}
