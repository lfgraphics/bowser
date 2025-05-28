"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export type ComboboxOption = {
    value: string
    label: string
}

type ComboboxProps = {
    options: ComboboxOption[]
    value: string
    onChange: (value: string) => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
    placeholder?: string
    width?: string
    className?: string
    searchTerm?: string
    onSearchTermChange?: (term: string) => void
}

const Combobox = ({
    options,
    value,
    onChange,
    open,
    onOpenChange,
    placeholder = "Select option...",
    width = "w-[200px]",
    className,
    searchTerm = "",
    onSearchTermChange,
}: ComboboxProps) => {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const isControlled = open !== undefined && onOpenChange !== undefined
    const actualOpen = isControlled ? open : internalOpen
    const setOpen = isControlled ? onOpenChange! : setInternalOpen

    console.log(options)

    return (
        <Popover open={actualOpen} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={actualOpen}
                    className={cn(width, "justify-between", className)}
                >
                    {value
                        ? options.find((item) => item.value === value)?.label
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn(width, "p-0 w-full")}>
                <Command>
                    <CommandInput placeholder={placeholder} value={searchTerm} onValueChange={(input) => {
                        if (onSearchTermChange) onSearchTermChange(input)
                    }} />
                    <CommandList>
                        <CommandEmpty>No option found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((item) => (
                                <CommandItem
                                    key={item.value}
                                    value={item.value}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue === value ? "" : currentValue)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {item.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
export default Combobox