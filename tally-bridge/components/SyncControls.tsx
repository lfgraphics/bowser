"use client"
import { useState } from 'react'
import { FolderSync, CirclePlay, CircleX, LoaderCircle } from 'lucide-react'
import { Button } from '../components/ui/button'
import Loading from '../app/loading'

interface SyncControlsProps {
  onManualSync: () => void
  onStartAutoSync: () => void
  onStopAutoSync: () => void
  nextSyncTime: string
  disabled?: boolean
}

export default function SyncControls({
  onManualSync,
  onStartAutoSync,
  onStopAutoSync,
  nextSyncTime,
  disabled = false,
}: SyncControlsProps) {
  const [isManual, setIsManual] = useState(false)
  const [isAuto, setIsAuto] = useState(false)
  const [isStop, setIsStop] = useState(false)

  const handleManual = async () => {
    try { setIsManual(true); await onManualSync(); } finally { setIsManual(false) }
  }
  const handleStart = async () => {
    try { setIsAuto(true); await onStartAutoSync(); } finally { setIsAuto(false) }
  }
  const handleStop = async () => {
    try { setIsStop(true); await onStopAutoSync(); } finally { setIsStop(false) }
  }
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      <Button onClick={handleManual} disabled={disabled || isManual} className="gap-2">
        {isManual ? <LoaderCircle className={'w-4 h-4 animate-spin'} /> : <FolderSync className={`w-4 h-4}`} />}
        {isManual ? 'Syncing...' : 'Run Manual Sync'}
      </Button>
      <Button onClick={handleStart} disabled={disabled || isAuto || isManual} variant="default" className="gap-2">
        <CirclePlay className={`w-4 h-4 ${isAuto ? 'animate-pulse' : ''}`} />
        Start Auto Sync
      </Button>
      <Button onClick={handleStop} disabled={disabled || isStop || isManual} variant="destructive" className="gap-2">
        <CircleX className={`w-4 h-4 ${isStop ? 'animate-pulse' : ''}`} />
        Stop Auto Sync
      </Button>
    </div>
  )
}