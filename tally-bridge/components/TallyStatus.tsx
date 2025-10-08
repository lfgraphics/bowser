"use client"
import { RefreshCw } from 'lucide-react'
import { Button } from '../components/ui/button'

interface TallyStatusProps {
  status: string
  companyName?: string
  onRefresh: () => void
}

export default function TallyStatus({ status, companyName, onRefresh }: TallyStatusProps) {
  const statusText = companyName
    ? `✅ ${status}: ${companyName}`
    : `⚠️ ${status}`

  const statusColor = companyName ? 'text-green-400' : 'text-yellow-400'

  return (
    <div className='flex justify-between items-baseline'>
      <div className={`text-lg mb-3 ${statusColor}`}>{statusText}</div>
      <Button onClick={onRefresh} variant='default' className="gap-2 flex">
        <RefreshCw className="w-4 h-4" />
        Refresh Tally Status
      </Button>
    </div>
  )
}