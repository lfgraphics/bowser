"use client"

import { useState, useEffect } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import ColumnFilterPopover from "@/components/ColumnFilterPopover"
import { cn, formatDate } from "@/lib/utils"
import ImageFromBufferObject from "./ImageFromBuffer"

export type ColumnConfig<T> = {
    key: keyof T | string
    label: string
    filterable?: boolean
    sortable?: boolean
    type?: "string" | "number" | "boolean" | "date" | "image"
    render?: (row: T) => React.ReactNode
}


interface FilterableTableProps<T> {
    data: T[]
    columns: ColumnConfig<T>[]
    className?: string
}

export default function FilterableTable<T extends Record<string, any>>({
    data,
    columns,
    className = "",
}: FilterableTableProps<T>) {
    const [rawData, setRawData] = useState<T[]>(data)
    const [filteredData, setFilteredData] = useState<T[]>(data)
    const [activeFilters, setActiveFilters] = useState<{ [key in keyof T]?: string[] }>({})
    const [sortConfig, setSortConfig] = useState<{ column: keyof T; direction: "asc" | "desc" | null } | null>(null)
    useEffect(() => {
        setRawData(data)
        setFilteredData(data)
    }, [data])

    useEffect(() => {
        let updated = [...rawData]


        // Apply filters
        Object.entries(activeFilters).forEach(([key, values]) => {
            if (values && values.length > 0) {
                updated = updated.filter(row => values.includes(String(row[key as keyof T])))
            }
        })

        // Apply sorting
        if (sortConfig?.direction && sortConfig.column) {
            updated.sort((a, b) => {
                const valA = a[sortConfig.column]
                const valB = b[sortConfig.column]

                if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
                    return sortConfig.direction === "asc"
                        ? Number(valA) - Number(valB)
                        : Number(valB) - Number(valA)
                }

                return sortConfig.direction === "asc"
                    ? String(valA).localeCompare(String(valB))
                    : String(valB).localeCompare(String(valA))
            })
        }

        setFilteredData(updated)
    }, [activeFilters, sortConfig, rawData])

    useEffect(() => {
        setFilteredData(data)
    }, [data])

    const handleFilter = (column: keyof T, values: string[], sort: "asc" | "desc" | null) => {
        setActiveFilters(prev => ({ ...prev, [column]: values }))

        setSortConfig(prev => {
            if (sort !== null) {
                return { column, direction: sort }
            }
            // Reset sort only if clearing the same column
            if (prev?.column === column && sort === null) {
                return null
            }
            return prev
        })
    }

    return (
        <Table className={cn(className)}>
            <TableHeader>
                <TableRow>
                    {columns.map(col => (
                        <TableHead key={String(col.key)}>
                            {col.filterable ? (
                                <ColumnFilterPopover
                                    columnName={col.label}
                                    data={rawData.map(row => String(row[col.key]))}
                                    onApply={(values, sort) => handleFilter(col.key, values, sort)}
                                    defaultSelected={activeFilters[col.key] || []}
                                    defaultSort={sortConfig?.column === col.key ? sortConfig.direction : null}
                                />
                            ) : (
                                col.label
                            )}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredData.map((row, idx) => (
                    <TableRow key={idx}>
                        {columns.map(col => (
                            <TableCell key={String(col.key)}>
                                {col.render ? (
                                    col.render(row)
                                ) : col.key in row ? (
                                    col.type === "boolean" ? (
                                        <input type="checkbox" checked={Boolean(row[col.key as keyof T])} disabled />
                                    ) : col.type === "number" ? (
                                        <span className="text-right block">{row[col.key as keyof T]}</span>
                                    ) : col.type === "date" ? (
                                        <span>{formatDate(row[col.key as keyof T] as string)}</span>
                                    ) : col.type === "image" ? (
                                        typeof row[col.key as keyof T] === "object" ? (
                                            <ImageFromBufferObject bufferObject={row[col.key as keyof T]} className="h-8 w-8 rounded-full" />
                                        ) : (
                                            <img src={row[col.key as keyof T] as string} className="h-8 w-8 rounded-full" />
                                        )
                                    ) : (
                                        String(row[col.key as keyof T] ?? "")
                                    )
                                ) : (
                                    ""
                                )}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
