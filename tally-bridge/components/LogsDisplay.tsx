"use client"
import { useEffect, useMemo, useRef } from 'react'
import type { LogEntry } from '../types/bridge'
import { Card, CardContent } from '../components/ui/card'
import { Info, TriangleAlert, XCircle } from 'lucide-react'

interface LogsDisplayProps {
  logs: LogEntry[]
}

export default function LogsDisplay({ logs }: LogsDisplayProps) {
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [logs])

  const getLogColor = (level: string) => {
    switch (level) {
      case 'INFO':
        return 'text-foreground'
      case 'WARN':
        return 'text-orange-400'
      case 'ERROR':
        return 'text-red-400'
      default:
        return 'text-foreground'
    }
  }

  const items = useMemo(() => logs?.map((log, idx) => ({ ...log, id: idx })), [logs])

  return (
    <Card className="mt-4">
      <CardContent>
        <div
          ref={logsContainerRef}
          className="h-[45svh] overflow-y-auto scrollbar-thin"
        >
          <div className="p-3 space-y-1 w-full">
            {items?.length ? (
              items.map((log, index) => (
                <div key={index} className="text-sm font-mono text-foreground group relative space-x-4 page-primary px-3 py-1">
                  <span className="text-muted-foreground">
                    {new Date(log.timestamp).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit'
                    }) + ', ' + new Date(log.timestamp).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </span>
                  <span className={`font-semibold ${getLogColor(log.level)}`}> {log.level === "INFO" ? <Info className="inline-block w-4 h-4" /> : log.level === "ERROR" ? <XCircle className="inline-block w-4 h-4" /> : log.level === "WARN" ? <TriangleAlert className="inline-block w-4 h-4" /> : log.level}</span>
                  <span className="text-foreground"> {log.message}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm font-mono">No logs available</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}