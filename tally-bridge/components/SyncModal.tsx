"use client"
import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

interface SyncModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (minutes: number) => void
  defaultValue?: number
}

export default function SyncModal({ isOpen, onClose, onSubmit, defaultValue = 60 }: SyncModalProps) {
  const [intervalValue, setIntervalValue] = useState(defaultValue)
  const [error, setError] = useState('')

  useEffect(() => {
    setIntervalValue(defaultValue)
  }, [defaultValue, isOpen])

  const handleSubmit = () => {
    if (intervalValue < 10) {
      setError('Interval must be at least 10 minutes')
      return
    }
    setError('')
    onSubmit(intervalValue)
  }

  const handleCancel = () => {
    setError('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">Set Auto Sync Interval</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-center text-neutral-300 mb-4">Enter interval in minutes (minimum 10):</DialogDescription>
        <div>
          <Input
            type="number"
            min={10}
            value={intervalValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIntervalValue(parseInt(e.target.value) || 10)}
            className="text-center"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        </div>
        <DialogFooter className="justify-center">
          <Button onClick={handleSubmit} variant="default" className="gap-2">
            <Check className="w-4 h-4" />
            Confirm
          </Button>
          <DialogClose className="gap-2">
            <Button variant="secondary">
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}