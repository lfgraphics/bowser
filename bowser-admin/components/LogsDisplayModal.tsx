"use client"

import { useEffect, useRef } from 'react'
import { Activity, Info, TriangleAlert, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'

export type LogEntry = {
  timestamp: string;
  type: string;
  level: string;
  message: string;
}

interface LogsDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  title?: string;
}

export default function LogsDisplayModal({ 
  isOpen, 
  onClose, 
  logs, 
  title = "Activity Logs" 
}: LogsDisplayModalProps) {
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs are added or dialog opens
  useEffect(() => {
    if (isOpen && logsContainerRef.current) {
      setTimeout(() => {
        if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
        }
      }, 100)
    }
  }, [isOpen, logs])

  const getLogColor = (level: string) => {
    switch (level) {
      case 'INFO':
        return 'text-foreground'
      case 'WARN':
        return 'text-orange-500'
      case 'ERROR':
        return 'text-red-500'
      default:
        return 'text-foreground'
    }
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'INFO':
        return <Info className="inline-block w-4 h-4 mr-1" />
      case 'ERROR':
        return <XCircle className="inline-block w-4 h-4 mr-1" />
      case 'WARN':
        return <TriangleAlert className="inline-block w-4 h-4 mr-1" />
      default:
        return null
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return {
        date: date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        }),
        time: date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      }
    } catch (error) {
      return { date: 'Invalid', time: 'Date' }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
            {logs.length > 0 && (
              <span className="text-sm text-muted-foreground font-normal">
                ({logs.length} entries)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Card className="h-full">
            <CardContent className="p-0">
              <div
                ref={logsContainerRef}
                className="h-[50vh] overflow-y-auto scrollbar-thin"
              >
                <div className="p-3 space-y-1 w-full">
                  {logs?.length > 0 ? (
                    logs.map((log, index) => {
                      const { date, time } = formatTimestamp(log.timestamp)
                      return (
                        <div 
                          key={index} 
                          className="text-sm font-mono group relative space-x-4 bg-muted/20 hover:bg-muted/40 px-3 py-2 rounded-sm transition-colors"
                        >
                          <span className="text-muted-foreground text-xs">
                            {date}, {time}
                          </span>
                          <span className={`font-semibold ${getLogColor(log.level)}`}>
                            {getLogIcon(log.level)}
                            {log.level}
                          </span>
                          <span className="text-foreground">{log.message}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-muted-foreground text-sm font-mono p-4 text-center">
                      No activity logs available
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}