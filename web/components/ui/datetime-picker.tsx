"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  className?: string
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date)
    setOpen(false) // close popover after selection
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!value}
          className={cn(
            "data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={value} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  )
}

interface DateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  className?: string
}

// A combined Date + Time picker using the same UI primitives as DatePicker
export function DateTimePicker({ value, onChange, className }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Local state to manage time (HH:mm)
  const initialTime = React.useMemo(() => {
    if (!value) return "00:00"
    const hrs = value.getHours().toString().padStart(2, "0")
    const mins = value.getMinutes().toString().padStart(2, "0")
    return `${hrs}:${mins}`
  }, [value])

  const [datePart, setDatePart] = React.useState<Date | undefined>(value)
  const [timePart, setTimePart] = React.useState<string>(initialTime)

  React.useEffect(() => {
    setDatePart(value)
    setTimePart(initialTime)
  }, [value, initialTime])

  const commit = (newDate?: Date, timeStr?: string) => {
    const d = newDate ?? datePart
    const t = timeStr ?? timePart
    if (!d) {
      onChange?.(undefined)
      return
    }
    const [hh, mm] = (t || "00:00").split(":").map((p) => parseInt(p || "0", 10))
    const combined = new Date(d)
    combined.setHours(hh || 0, mm || 0, combined.getSeconds(), combined.getMilliseconds())
    onChange?.(combined)
  }

  const handleSelectDate = (d?: Date) => {
    setDatePart(d)
    if (d) commit(d, undefined)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value
    setTimePart(t)
    commit(undefined, t)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!value}
          className={cn(
            "data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP p") : <span>Pick date & time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-start">
          <Calendar mode="single" selected={datePart} onSelect={handleSelectDate} />
          <div className="flex items-center gap-2 p-2">
            <label htmlFor="timeInput" className="text-sm text-muted-foreground">Time</label>
            <input
              id="timeInput"
              type="time"
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm outline-none"
              value={timePart}
              onChange={handleTimeChange}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
