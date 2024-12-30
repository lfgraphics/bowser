'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function UnauthorizedPage() {
    const searchParams = useSearchParams()
    const msg = searchParams.get('msg')

    useEffect(() => {
        if (msg === 'not-allowed') {
            alert('You are not allowed to visit this route')
        }
    }, [msg])

    return <div>Oops, you are not authorized.</div>
}
