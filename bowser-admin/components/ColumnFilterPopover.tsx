"use client"

import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { Label } from "./ui/label"
import { Filter } from "lucide-react"

interface ColumnFilterProps {
    columnName: string
    data: string[]
    onApply: (filterValues: string[], sort: "asc" | "desc" | null) => void
    defaultSelected?: string[] // <- NEW (for keeping previous filter memory)
    defaultSort?: "asc" | "desc" | null // <- NEW
}

export default function ColumnFilterPopover({
    columnName,
    data,
    onApply,
    defaultSelected = [],
    defaultSort = null,
}: ColumnFilterProps) {
    const uniqueValues = Array.from(new Set(data)).sort()

    const [search, setSearch] = useState("")
    const [tempSelected, setTempSelected] = useState<string[]>([])
    const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(defaultSort)
    const [open, setOpen] = useState(false) // <- used to control popover close

    useEffect(() => {
        if (open) {
            setTempSelected(defaultSelected && defaultSelected.length > 0 ? defaultSelected : uniqueValues)
            setSortOrder(defaultSort)
        }
    }, [open])


    const toggleSelection = (value: string) => {
        setTempSelected(prev =>
            prev.includes(value)
                ? prev.filter(v => v !== value)
                : [...prev, value]
        )
    }

    const applyChanges = () => {
        onApply(tempSelected, sortOrder)
        setOpen(false)
    }

    const reset = () => {
        setTempSelected(uniqueValues)
        setSortOrder(null)
        setSearch("")
        onApply(uniqueValues, null)
        setOpen(false)
    }

    const cancelChanges = () => {
        setOpen(false)
    }

    const filteredList = uniqueValues.filter(v =>
        v.toLowerCase().includes(search.toLowerCase())
    )

    const baseId = `filter-${columnName.replace(/\s+/g, "-").toLowerCase()}`

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild className="w-full flex items-center justify-between">
                <div>
                    {columnName}<Button variant="ghost" size="sm"><Filter className={tempSelected.length === uniqueValues.length && sortOrder === null && search === "" ? "" : "fill-foreground"} /> </Button>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 space-y-2">
                {/* Sort Buttons */}
                <div className="flex justify-between gap-2">
                    <Button
                        variant={sortOrder === "asc" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSortOrder("asc")}
                    >
                        Sort A–Z
                    </Button>
                    <Button
                        variant={sortOrder === "desc" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSortOrder("desc")}
                    >
                        Sort Z–A
                    </Button>
                </div>

                {/* Text Filter */}
                <Input
                    placeholder="Search values..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {/* Checkbox List */}
                <div className="max-h-40 overflow-y-auto border rounded px-2 py-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`${baseId}-select-all`}
                            checked={filteredList.length > 0 && filteredList.every(v => tempSelected.includes(v))}
                            onCheckedChange={(checked) =>
                                setTempSelected(checked ? filteredList : [])
                            }
                        />
                        <Label htmlFor={`${baseId}-select-all`}>Select All</Label>
                    </div>

                    {filteredList.map((val, idx) => {
                        const checkboxId = `${baseId}-option-${idx}-${val.replace(/\s+/g, "-")}`
                        return (
                            <div key={val} className="flex items-center gap-2">
                                <Checkbox
                                    id={checkboxId}
                                    checked={tempSelected.includes(val)}
                                    onCheckedChange={() => toggleSelection(val)}
                                />
                                <Label htmlFor={checkboxId} className="text-sm">{val}</Label>
                            </div>
                        )
                    })}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between gap-2 pt-2 items-center">
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={reset}
                            disabled={tempSelected.length === uniqueValues.length && sortOrder === null && search === ""}
                        >
                            Clear Filter
                        </Button>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Button variant="outline" size="sm" onClick={applyChanges}>OK</Button>
                        <Button variant="ghost" size="sm" onClick={cancelChanges}>Cancel</Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
