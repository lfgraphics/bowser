'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import TallyStatus from '../components/TallyStatus'
import SyncControls from '../components/SyncControls'
import LogsDisplay from '../components/LogsDisplay'
import SyncModal from '../components/SyncModal'
import SettingsSheet from '../components/SettingsSheet'
import type { TallyStatus as TallyStatusType, LogEntry } from '../types/bridge'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import Loading from './loading'

export default function HomePage() {
  const [tallyStatus, setTallyStatus] = useState<TallyStatusType>({ status: 'Checking...' })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [nextSyncTime, setNextSyncTime] = useState('Fetching sync status...')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [syncInterval, setSyncInterval] = useState(60)
  const [bridgeReady, setBridgeReady] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [bridgeError, setBridgeError] = useState<string | null>(null)
  const [localUri, setLocalUri] = useState('')
  const [localUriStatus, setLocalUriStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [localUriMessage, setLocalUriMessage] = useState('')
  const [syncing, setSyncing] = useState(false)

  // Initialize and refresh functions
  const refreshStatus = async () => {
    try {
      setSyncing(true)
      if (!window?.bridge) return
      const result = await window.bridge.checkTallyStatus()
      if (result) setTallyStatus(result)
    } catch (error) {
      console.error('Failed to refresh status:', error)
      setTallyStatus({ status: 'Error checking status' })
    } finally {
      setSyncing(false)
    }
  }

  const refreshLogs = async () => {
    try {
      if (!window?.bridge) return
      const [logsResult, nextSyncResult] = await Promise.all([
        window.bridge.getSyncLogs(),
        window.bridge.getNextSyncTime()
      ])
      setLogs(Array.isArray(logsResult) ? logsResult : [])
      setNextSyncTime(typeof nextSyncResult === 'string' ? nextSyncResult : 'Not Scheduled')
    } catch (error) {
      console.error('Failed to refresh logs:', error)
    }
  }

  const runSync = async () => {
    try {
      if (!window?.bridge) return
      await window.bridge.runManualSync()
      refreshLogs()
    } catch (error) {
      console.error('Failed to run sync:', error)
    }
  }

  const startSync = () => {
    setIsModalOpen(true)
  }

  const stopSync = async () => {
    try {
      if (!window?.bridge) return
      await window.bridge.stopSyncInterval()
      refreshLogs()
    } catch (error) {
      console.error('Failed to stop sync interval:', error)
    }
  }

  const submitInterval = async (minutes: number) => {
    try {
      if (!window?.bridge) return
      await window.bridge.setSyncInterval(minutes)
      setIsModalOpen(false)
      refreshLogs()
    } catch (error) {
      console.error('Failed to set sync interval:', error)
    }
  }

  // Set up event listeners and initial load
  useEffect(() => {
    setMounted(true)
    const handleRefreshLogs = () => {
      refreshLogs()
    }

    // We'll set up the listener once the bridge is ready
    let dispose: (() => void) | undefined

    // Wait for preload bridge to be available
    let cancelled = false
    const waitForBridge = async () => {
      for (let i = 0; i < 50 && !cancelled; i++) { // ~5s
        if (window?.bridge) {
          setBridgeReady(true)
          break
        }
        await new Promise(r => setTimeout(r, 100))
      }
      if (!cancelled && window?.bridge) {
        console.log('[Renderer] Bridge is ready')
        setBridgeError(null)
        refreshStatus()
        refreshLogs()
        // Load current Local URI
        try {
          const uri = await window.bridge.getLocalUri()
          if (typeof uri === 'string') setLocalUri(uri)
        } catch (e) {
          console.warn('Failed to fetch localUri', e)
        }
        dispose = window.bridge.onRefreshLogs(handleRefreshLogs)
      } else if (!cancelled) {
        console.warn('[Renderer] Bridge not available')
        setBridgeError('Bridge did not initialize. Please restart the app or check logs (Ctrl+Shift+I).')
      }
    }
    waitForBridge()

    // Cleanup listener on unmount
    return () => {
      cancelled = true
      dispose?.()
    }
  }, [])

  if (!mounted) return null

  return (
    <>
      {syncing && <Loading />}
      <div className="min-h-screen bg-background text-foreground p-5 overflow-x-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div className="max-w-4xl mx-auto" style={{ maxWidth: 960, overflow: 'hidden' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-center flex-1">Tally Bridge</h2>
            <SettingsSheet
              localUri={localUri}
              setLocalUri={setLocalUri}
              localUriStatus={localUriStatus}
              localUriMessage={localUriMessage}
              bridgeReady={bridgeReady}
              onSaveLocalUri={async () => {
                setLocalUriStatus('saving')
                setLocalUriMessage('')
                try {
                  // Simple validation
                  if (!/^mongodb(\+srv)?:\/\//.test(localUri)) {
                    throw new Error('URI must start with mongodb:// or mongodb+srv://')
                  }
                  const res = await window.bridge?.setLocalUri(localUri)
                  if (res?.success) {
                    setLocalUriStatus('success')
                    setLocalUriMessage('Saved successfully. Some changes may require app restart.')
                  } else {
                    throw new Error(res?.error || 'Failed to save')
                  }
                } catch (err: any) {
                  setLocalUriStatus('error')
                  setLocalUriMessage(err?.message || 'Invalid URI')
                } finally {
                  setTimeout(() => {
                    setLocalUriStatus('idle')
                  }, 2500)
                }
              }}
            />
          </div>

          <TallyStatus status={tallyStatus?.status} companyName={tallyStatus?.companyName} onRefresh={refreshStatus} />

          <Card className="mb-4 p-4">
            <CardContent className='flex flex-col justify-between gap-2'>
              <h2 className="text-2xl font-bold text-center">Cloud and Local data Sync</h2>
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Next Sync: {nextSyncTime}</span>
              </div>
              <SyncControls
                onManualSync={runSync}
                onStartAutoSync={startSync}
                onStopAutoSync={stopSync}
                disabled={!bridgeReady}
                nextSyncTime={nextSyncTime}
              />
            </CardContent>
          </Card>

          {!bridgeReady && bridgeError && (
            <Card className="mb-4 border-red-800">
              <CardContent>
                <div className="text-red-400 text-sm">
                  {bridgeError}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => window.location.reload()}>Retry</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <LogsDisplay logs={logs} />

          <SyncModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={submitInterval}
            defaultValue={syncInterval}
          />
        </div>
      </div>
    </>
  )
}