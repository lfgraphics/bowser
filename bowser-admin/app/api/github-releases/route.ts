import { NextRequest, NextResponse } from 'next/server';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export async function GET(req: NextRequest) {
    const res = await fetch('https://api.github.com/repos/lfgraphics/bowser/releases', {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json'
        }
    });

    const data = await res.json();
    return NextResponse.json(data);
}