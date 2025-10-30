import React from 'react'
import { Button } from './ui/button'
import { RefreshCwIcon } from 'lucide-react'

const RefreshPageButton = () => {
    return (
        <Button onClick={() => window.location.reload()}><RefreshCwIcon className='mr-2' />Refresh</Button>
    )
}

export default RefreshPageButton
