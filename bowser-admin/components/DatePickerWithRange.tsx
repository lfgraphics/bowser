"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "./ui/input"

export function DatePickerWithRange({
    className,
    onDateChange, // Add this prop
}: React.HTMLAttributes<HTMLDivElement> & { onDateChange?: (date: DateRange | undefined) => void }) {
    const [date, setDate] = React.useState<DateRange | undefined>(undefined) // Initial state is undefined
    // const [months, setMonths] = React.useState(2)

    // Notify parent when date changes
    React.useEffect(() => {
        if (onDateChange) {
            onDateChange(date)
        }
    }, [date, onDateChange])

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>(Comming Soon) Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    {/* <Input value={months} onChange={(e) => setMonths(Number(e.target.value))}></Input> */}
                    <Calendar
                        disabled
                        initialFocus
                        mode="range"
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2} // months
                        fromDate={new Date(2024, 10, 5)} // Minimum date: November 6, 2024
                        toDate={new Date()} // Maximum date: Today
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}