"use client"

import { useState, useEffect } from "react"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import ColumnFilterPopover from "@/components/ColumnFilterPopover"
import { cn, formatDate } from "@/lib/utils"
import ImageFromBufferObject from "./ImageFromBuffer"
import { Button } from "./ui/button"

function getNestedValue<T>(obj: T, path: string): any {
    return path.split(".").reduce((acc, part) => (acc as any)?.[part], obj)
}

export type ColumnConfig<T> = {
    key: keyof T | string
    label: string
    filterable?: boolean
    sortable?: boolean
    type?: "string" | "number" | "boolean" | "date" | "image"
    render?: (row: T) => React.ReactNode
    getValue?: (row: T) => any
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

        Object.entries(activeFilters).forEach(([key, values]) => {
            const col = columns.find(c => c.key === key)
            if (!col || !values?.length) return

            updated = updated.filter(row => {
                const value = col.getValue ? col.getValue(row) : row[col.key as keyof T]
                return values.includes(String(value))
            })
        })

        if (sortConfig?.direction && sortConfig.column) {
            const col = columns.find(c => c.key === sortConfig.column)
            updated.sort((a, b) => {
                const valA = col?.getValue ? col.getValue(a) : a[sortConfig.column]
                const valB = col?.getValue ? col.getValue(b) : b[sortConfig.column]

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

    // const resetAll = () => {
    //     setActiveFilters({})
    //     setSortConfig(null)
    // }

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
                                    data={rawData.map(row =>
                                        String(col.getValue ? col.getValue(row) : row[col.key as keyof typeof row])
                                    )}
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
                                        <input type="checkbox" checked={Boolean(getNestedValue(row, String(col.key)))} disabled />
                                    ) : col.type === "number" ? (
                                        <span className="text-right block">{getNestedValue(row, String(col.key))}</span>
                                    ) : col.type === "date" ? (
                                        <span>{formatDate(getNestedValue(row, String(col.key)) as string)}</span>
                                    ) : col.type === "image" ? (
                                        typeof row[col.key as keyof T] === "object" ? (
                                            <ImageFromBufferObject bufferObject={row[col.key as keyof T]} className="h-8 w-8 rounded-full" />
                                        ) : (
                                            <img src={getNestedValue(row, String(col.key)) as string} className="h-8 w-8 rounded-full" />
                                        )
                                    ) : (
                                        String(getNestedValue(row, String(col.key)) ?? "")
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
